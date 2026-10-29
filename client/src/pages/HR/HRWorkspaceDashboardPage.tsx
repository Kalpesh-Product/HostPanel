import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  CalendarCheck,
  Cake,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  UserMinus,
  UserPlus,
  Users,
  UserSquare,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import { DepartmentVisitorsCard } from "../Dashboard/FrontendDashboard/dashboard/DepartmentVisitorsCard";
import { TeamLiveStatusCard } from "../Dashboard/FrontendDashboard/dashboard/TeamLiveStatusCard";
import hrBannerImage from "../../assets/hr-dashboard-banner.webp";
import { DEFAULT_FISCAL_YEAR } from "../../features/finance/utils/fiscalYear";
import useDashboardAccess from "../../hooks/useDashboardAccess";
import {
  getHrAttendanceReview,
  getTeamAttendance,
} from "../../services/attendance";
import { getDepartmentFinanceData } from "../../services/finance";
import {
  getEmployeeManagementOverview,
  getEmployeeDocumentsVault,
  getPayrollSnapshot,
} from "../../services/hr";
import { getLeaveRequests } from "../../services/leave-requests";
import { getRecruitmentOverview } from "../../services/recruitment";
import { getResignationRequests } from "../../services/resignation-management";

type DataRecord = Record<string, any>;
type HRDashboardData = {
  employees: DataRecord[];
  candidates: DataRecord[];
  jobOpenings: DataRecord[];
  leaveRequests: DataRecord[];
  teamAttendance: DataRecord[];
  corrections: DataRecord[];
  payrollEmployees: DataRecord[];
  resignations: DataRecord[];
  documents: DataRecord[];
  departmentFinance: DataRecord | null;
};

const EMPTY_DATA: HRDashboardData = {
  employees: [],
  candidates: [],
  jobOpenings: [],
  leaveRequests: [],
  teamAttendance: [],
  corrections: [],
  payrollEmployees: [],
  resignations: [],
  documents: [],
  departmentFinance: null,
};
const HR_MODULES = [
  {
    id: "employee-management",
    label: "Company Management",
    icon: UserSquare,
    route: "/department-accesses/hr-department/company-management",
    description: "Employees, teams, and company records",
    color: "#2563EB",
  },
  {
    id: "hr-documents",
    label: "Documents",
    icon: FileText,
    route: "/department-accesses/hr-department/documents",
    description: "Policies and employee documents",
    color: "#7C3AED",
  },
  {
    id: "recruitment",
    label: "Recruitment",
    icon: UserPlus,
    route: "/department-accesses/hr-department/recruitment",
    description: "Candidates and open positions",
    color: "#0D9488",
  },
  {
    id: "leave-request-processing",
    label: "Leave Request Processing",
    icon: CalendarCheck,
    route: "/department-accesses/hr-department/leave-request-processing",
    description: "Review and process leave requests",
    color: "#EA580C",
  },
  {
    id: "attendance-review",
    label: "Attendance Review",
    icon: Clock3,
    route: "/department-accesses/hr-department/attendance-review",
    description: "Attendance records and corrections",
    color: "#0891B2",
  },
  {
    id: "payroll-management",
    label: "Payroll Management",
    icon: Banknote,
    route: "/department-accesses/hr-department/payroll-management",
    description: "Payroll cycles and employee payouts",
    color: "#16A34A",
  },
  {
    id: "exit-management",
    label: "Resignation Management",
    icon: UserMinus,
    route: "/department-accesses/hr-department/resignation-management",
    description: "Notice periods and employee exits",
    color: "#DC2626",
  },
] as const;
const DONUT_PALETTE = [
  "#1E3D73",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#7C3AED",
  "#EF4444",
];
const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
const numeric = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
const list = (value: unknown) =>
  Array.isArray(value) ? (value as DataRecord[]) : [];
const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100000 ? 1 : 0,
  }).format(value || 0);
const readableLabel = (value: unknown) =>
  String(value || "Pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: unknown) => {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const statusTone = (status: unknown) => {
  const value = normalize(status);
  if (
    value.includes("approve") ||
    value.includes("present") ||
    value.includes("select") ||
    value.includes("complete")
  )
    return "bg-emerald-50 text-emerald-700";
  if (
    value.includes("reject") ||
    value.includes("absent") ||
    value.includes("cancel")
  )
    return "bg-rose-50 text-rose-700";
  if (
    value.includes("progress") ||
    value.includes("contact") ||
    value.includes("notice")
  )
    return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
};

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
      {children}
    </div>
  );
}
function ChartCard({
  title,
  subtitle,
  action,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ?? null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
  status?: "default" | "success" | "attention";
}) {
  const tones = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[status]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
function SummaryCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; value: string | number; tone?: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <span className="text-[10px] font-pmedium text-slate-500">
              {row.label}
            </span>
            <span
              className={`text-right text-[13px] font-pmedium ${row.tone || "text-slate-900"}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordsTable({
  records,
  columns,
  emptyLabel,
}: {
  records: DataRecord[];
  columns: Array<{
    label: string;
    render: (record: DataRecord, index: number) => ReactNode;
  }>;
  emptyLabel: string;
}) {
  if (!records.length) return <Empty>{emptyLabel}</Empty>;

  return (
    <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
      <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className="px-5 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record, index) => (
            <tr
              key={
                record.id ||
                record._id ||
                record.recordId ||
                record.employeeId ||
                index
              }
              className="text-[11px] text-slate-600 hover:bg-blue-50/30"
            >
              {columns.map((column) => (
                <td key={column.label} className="px-5 py-3">
                  {column.render(record, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HRWorkspaceDashboardPage() {
  const access = useDashboardAccess();
  const [data, setData] = useState<HRDashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getEmployeeManagementOverview(),
      getRecruitmentOverview(),
      getLeaveRequests(),
      getHrAttendanceReview(),
      getTeamAttendance({ date: new Date().toISOString().slice(0, 10) }),
      getPayrollSnapshot(),
      getResignationRequests(),
      getEmployeeDocumentsVault(),
      getDepartmentFinanceData(DEFAULT_FISCAL_YEAR, "HR"),
    ]).then((results) => {
      if (cancelled) return;
      const [
        employeesResult,
        recruitmentResult,
        leavesResult,
        attendanceResult,
        teamAttendanceResult,
        payrollResult,
        resignationsResult,
        documentsResult,
        financeResult,
      ] = results;
      const employeePayload =
        employeesResult.status === "fulfilled"
          ? employeesResult.value?.data || {}
          : {};
      const recruitmentPayload =
        recruitmentResult.status === "fulfilled"
          ? recruitmentResult.value || {}
          : {};
      const leavesPayload =
        leavesResult.status === "fulfilled" ? leavesResult.value || {} : {};
      const attendancePayload =
        attendanceResult.status === "fulfilled"
          ? attendanceResult.value || {}
          : {};
      const teamAttendancePayload =
        teamAttendanceResult.status === "fulfilled"
          ? teamAttendanceResult.value || {}
          : {};
      const payrollPayload =
        payrollResult.status === "fulfilled" ? payrollResult.value || {} : {};
      const resignationPayload =
        resignationsResult.status === "fulfilled"
          ? resignationsResult.value || {}
          : {};
      const documentsPayload =
        documentsResult.status === "fulfilled"
          ? documentsResult.value?.data || {}
          : {};
      const financePayload =
        financeResult.status === "fulfilled"
          ? financeResult.value || null
          : null;
      setData({
        employees: list(employeePayload.employees),
        candidates: list(recruitmentPayload.candidates),
        jobOpenings: list(recruitmentPayload.jobOpenings),
        leaveRequests: list(leavesPayload.leaveRequests),
        teamAttendance: list(teamAttendancePayload.records),
        corrections: list(
          attendancePayload.corrections || attendancePayload.correctionRequests,
        ),
        payrollEmployees: list(payrollPayload.currentCycle?.employees),
        resignations: [
          ...list(resignationPayload.exitRequests),
          ...list(resignationPayload.pendingRequests),
          ...list(resignationPayload.activeNoticeRequests),
        ],
        documents: list(documentsPayload.documents).length
          ? list(documentsPayload.documents)
          : list(documentsPayload.employees).flatMap((employee) =>
              list(employee.documents).map((document) => ({
                ...document,
                employeeName: employee.name || employee.fullName,
                employeeId: employee.employeeId || employee.id,
              })),
            ),
        departmentFinance:
          financePayload?.data?.data || financePayload?.data || financePayload,
      });
      setLoadError(
        results.some((result) => result.status === "rejected")
          ? "Some HR, documents, payroll, attendance, or budget data could not be refreshed."
          : "",
      );
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const enabledModules = useMemo(() => {
    if (access.isLoading) return [...HR_MODULES];
    const filtered = HR_MODULES.filter((module) => access.hasModule(module.id));
    return filtered.length ? filtered : [...HR_MODULES];
  }, [access]);
  const stats = useMemo(() => {
    const present = data.teamAttendance.filter((record) => {
      const status = normalize(record.displayStatus || record.status);
      return (
        status.includes("present") ||
        status.includes("late") ||
        Boolean(record.checkIn || record.checkInAt || record.clockIn)
      );
    }).length;
    const pendingLeaves = data.leaveRequests.filter((request) =>
      normalize(request.status).includes("pending"),
    ).length;
    const pendingCorrections = data.corrections.filter(
      (request) =>
        !request.status || normalize(request.status).includes("pending"),
    ).length;
    const pendingResignations = data.resignations.filter((request) => {
      const status = normalize(request.status || request.statusLabel);
      return !status || status.includes("pending") || status.includes("notice");
    }).length;
    const payrollPayable = data.payrollEmployees.reduce(
      (sum, employee) =>
        sum +
        numeric(
          employee.financials?.netSalary ??
            employee.netSalary ??
            employee.netPayable,
        ),
      0,
    );
    const payrollPaid = data.payrollEmployees.filter((employee) =>
      normalize(
        employee.payment?.status || employee.financials?.paymentStatus,
      ).includes("paid"),
    ).length;
    const birthdayMonth = new Date().getMonth();
    const birthdaysThisMonth = data.employees.filter((employee) => {
      const raw = employee.dateOfBirth || employee.dob || employee.birthDate;
      if (!raw) return false;
      const date = new Date(raw);
      return !Number.isNaN(date.getTime()) && date.getMonth() === birthdayMonth;
    }).length;
    const activeNotice = data.resignations.filter((request) => {
      const status = normalize(request.status || request.statusLabel);
      return status.includes("approve") || status.includes("notice");
    }).length;
    return {
      present,
      pendingLeaves,
      pendingCorrections,
      pendingResignations,
      payrollPayable,
      payrollPaid,
      birthdaysThisMonth,
      activeNotice,
      attendanceRate: data.employees.length
        ? Math.round((present / data.employees.length) * 100)
        : 0,
    };
  }, [data]);
  const budget = useMemo(() => {
    const rows = list(data.departmentFinance?.monthlyPlan).map(
      (month, index) => {
        const expenses = list(month.expenses);
        const expensesProjected = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.projectedAmount ?? expense.amount),
          0,
        );
        const expensesActual = expenses.reduce(
          (sum, expense) =>
            sum + numeric(expense.actualSpent ?? expense.actualAmount),
          0,
        );
        return {
          label: String(
            month.month ||
              month.monthLabel ||
              month.monthKey ||
              `M${index + 1}`,
          ).slice(0, 3),
          projected:
            expensesProjected ||
            numeric(
              month.projectedBudget ?? month.projectedAmount ?? month.amount,
            ),
          actual:
            expensesActual || numeric(month.actualSpent ?? month.actualAmount),
        };
      },
    );
    const projected = rows.reduce((sum, row) => sum + row.projected, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      rows,
      projected,
      actual,
      remaining: Math.max(0, projected - actual),
      hasData: rows.some((row) => row.projected > 0 || row.actual > 0),
    };
  }, [data.departmentFinance]);
  const grouped = (
    records: DataRecord[],
    value: (record: DataRecord) => unknown,
  ) => {
    const map = new Map<string, number>();
    records.forEach((record) => {
      const label = readableLabel(value(record));
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()].slice(0, 6);
  };
  const attendanceStatus = useMemo(
    () =>
      grouped(
        data.teamAttendance,
        (record) =>
          record.displayStatus ||
          record.status ||
          (record.checkIn ? "Present" : "Absent"),
      ),
    [data.teamAttendance],
  );
  const recruitmentStatus = useMemo(
    () => grouped(data.candidates, (candidate) => candidate.status || "New"),
    [data.candidates],
  );
  const leaveStatus = useMemo(
    () => grouped(data.leaveRequests, (request) => request.status || "Pending"),
    [data.leaveRequests],
  );
  const employeeGender = useMemo(
    () =>
      grouped(data.employees, (employee) => employee.gender || "Not specified"),
    [data.employees],
  );
  const employeeCity = useMemo(
    () =>
      grouped(
        data.employees,
        (employee) => employee.homeAddress?.city || employee.city || "Other",
      ),
    [data.employees],
  );
  const payrollStatus = useMemo(
    () =>
      grouped(
        data.payrollEmployees,
        (employee) =>
          employee.payment?.status ||
          employee.financials?.paymentStatus ||
          "Pending",
      ),
    [data.payrollEmployees],
  );
  const documentTypes = useMemo(
    () =>
      grouped(
        data.documents,
        (document) =>
          document.typeLabel || document.type || document.source || "Document",
      ),
    [data.documents],
  );
  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
      };
    });
    const count = (records: DataRecord[], fields: string[]) =>
      months.map(
        (month) =>
          records.filter((record) => {
            const raw = fields.map((field) => record[field]).find(Boolean);
            if (!raw) return false;
            const date = new Date(raw);
            return (
              !Number.isNaN(date.getTime()) &&
              `${date.getFullYear()}-${date.getMonth()}` === month.key
            );
          }).length,
      );
    return {
      labels: months.map((month) => month.label),
      candidates: count(data.candidates, [
        "createdAt",
        "appliedAt",
        "updatedAt",
      ]),
      leaves: count(data.leaveRequests, ["createdAt", "updatedAt"]),
    };
  }, [data.candidates, data.leaveRequests]);
  const recentCandidates = useMemo(
    () =>
      [...data.candidates]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.appliedAt || 0).getTime() -
            new Date(a.createdAt || a.appliedAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.candidates],
  );
  const recentLeaves = useMemo(
    () =>
      [...data.leaveRequests]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.leaveRequests],
  );
  const recentCorrections = useMemo(
    () =>
      [...data.corrections]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.requestedAt || 0).getTime() -
            new Date(a.createdAt || a.requestedAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.corrections],
  );
  const recentPayroll = useMemo(
    () => [...data.payrollEmployees].slice(0, 8),
    [data.payrollEmployees],
  );
  const recentDocuments = useMemo(
    () =>
      [...data.documents]
        .sort(
          (a, b) =>
            new Date(b.uploadedAt || b.createdAt || 0).getTime() -
            new Date(a.uploadedAt || a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.documents],
  );
  const recentResignations = useMemo(
    () =>
      [...data.resignations]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 8),
    [data.resignations],
  );
  const birthdaysThisMonth = useMemo(() => {
    const month = new Date().getMonth();
    return data.employees
      .map((employee) => {
        const raw = employee.dateOfBirth || employee.dob || employee.birthDate;
        const date = raw ? new Date(raw) : null;
        return { ...employee, birthdayDate: date };
      })
      .filter(
        (employee) =>
          employee.birthdayDate &&
          !Number.isNaN(employee.birthdayDate.getTime()) &&
          employee.birthdayDate.getMonth() === month,
      )
      .sort(
        (a, b) =>
          (a.birthdayDate?.getDate() || 0) - (b.birthdayDate?.getDate() || 0),
      )
      .slice(0, 8);
  }, [data.employees]);
  const recentAttendance = useMemo(
    () => [...data.teamAttendance].slice(0, 8),
    [data.teamAttendance],
  );
  const baseChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthlyActivity.labels },
    colors: ["#2563EB", "#22C55E"],
    tooltip: { theme: "light" },
  };
  const budgetChartOptions = {
    ...baseChartOptions,
    xaxis: { categories: budget.rows.map((row) => row.label) },
    yaxis: { labels: { formatter: (value: number) => currency(value) } },
    tooltip: {
      theme: "light",
      y: { formatter: (value: number) => currency(value) },
    },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <header className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={hrBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="text-[30px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
                <span className="text-primary">HR</span>{" "}
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Live workforce, documents, attendance, recruitment, leave,
                payroll, and employee-lifecycle visibility across HR operations.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Workforce", "Attendance", "Recruitment", "Payroll"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/75">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] text-white">
                {enabledModules.length}
              </p>
            </div>
          </div>
        </header>
        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} />
            {loadError} Existing values may be incomplete.
          </div>
        ) : null}
        {isLoading || access.isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div
                key={key}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Users size={20} />}
              label="Total employees"
              value={data.employees.length}
              sub={`${stats.present} present today`}
            />
            <StatTile
              icon={<CheckCircle2 size={20} />}
              label="Attendance rate"
              value={`${stats.attendanceRate}%`}
              sub={`${stats.present} of ${data.employees.length} employees`}
              status={stats.attendanceRate >= 75 ? "success" : "attention"}
            />
            <StatTile
              icon={<CalendarCheck size={20} />}
              label="Pending leaves"
              value={stats.pendingLeaves}
              sub={`${data.leaveRequests.length} total leave requests`}
              status={stats.pendingLeaves ? "attention" : "success"}
            />
            <StatTile
              icon={<Briefcase size={20} />}
              label="Open positions"
              value={data.jobOpenings.length}
              sub={`${data.candidates.length} candidate records`}
            />
            <StatTile
              icon={<FileText size={20} />}
              label="Employee documents"
              value={data.documents.length}
              sub="Documents available in the HR vault"
            />
            <StatTile
              icon={<Clock3 size={20} />}
              label="Corrections"
              value={stats.pendingCorrections}
              sub="Awaiting HR attendance review"
              status={stats.pendingCorrections ? "attention" : "success"}
            />
            <StatTile
              icon={<Banknote size={20} />}
              label="Payroll payable"
              value={currency(stats.payrollPayable)}
              sub={`${stats.payrollPaid}/${data.payrollEmployees.length} employees paid`}
            />
            <StatTile
              icon={<UserMinus size={20} />}
              label="Exit attention"
              value={stats.pendingResignations}
              sub="Pending requests and notice periods"
              status={stats.pendingResignations ? "attention" : "success"}
            />
          </div>
        )}
        {!isLoading ? (
          <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TeamLiveStatusCard
              department="hr"
              viewAllRoute="/department-accesses/hr-department/attendance-review"
            />
            <DepartmentVisitorsCard department="hr" title="HR Visitors" />
          </section>
        ) : null}
        {!isLoading ? (
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-pmedium text-slate-900">
                HR operations overview
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Workforce activity, employee requests, payroll, and approved
                budget position.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <SummaryCard
                title="Workforce"
                icon={<Users size={18} />}
                rows={[
                  { label: "Headcount", value: data.employees.length },
                  { label: "Present today", value: stats.present },
                  {
                    label: "Birthdays this month",
                    value: stats.birthdaysThisMonth,
                  },
                  { label: "Employee documents", value: data.documents.length },
                ]}
              />
              <SummaryCard
                title="Requests"
                icon={<CalendarCheck size={18} />}
                rows={[
                  {
                    label: "Pending leaves",
                    value: stats.pendingLeaves,
                    tone: stats.pendingLeaves
                      ? "text-amber-700"
                      : "text-emerald-700",
                  },
                  {
                    label: "Attendance corrections",
                    value: stats.pendingCorrections,
                  },
                  { label: "Candidates", value: data.candidates.length },
                  { label: "Exit attention", value: stats.pendingResignations },
                ]}
              />
              <SummaryCard
                title="Payroll & budget"
                icon={<WalletCards size={18} />}
                rows={[
                  {
                    label: "Payroll payable",
                    value: currency(stats.payrollPayable),
                  },
                  {
                    label: "Projected budget",
                    value: currency(budget.projected),
                  },
                  { label: "Actual spent", value: currency(budget.actual) },
                  { label: "Remaining", value: currency(budget.remaining) },
                ]}
              />
            </div>
          </section>
        ) : null}
        <section className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-pmedium text-slate-900">
                Manage HR operations
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Open the same enabled modules available in the HR Dashboard
                dropdown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={isLoading}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {enabledModules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.label}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                  state={{ fromSection: "hr-department" }}
                />
              );
            })}
          </div>
        </section>
        {!isLoading ? (
          <>
            <div className="mb-4">
              <ChartCard
                title="HR Budget: Projected vs Actual Spent"
                subtitle={`${DEFAULT_FISCAL_YEAR} monthly Finance Management plan for HR.`}
                action={
                  access.hasModule("finance-management") ? (
                    <Link
                      to="/extra-common-modules/finance-management"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    >
                      Finance Management
                    </Link>
                  ) : undefined
                }
              >
                {budget.hasData ? (
                  <GroupedBarGraph
                    options={budgetChartOptions}
                    series={[
                      {
                        name: "Projected budget",
                        data: budget.rows.map((row) => row.projected),
                      },
                      {
                        name: "Actual spent",
                        data: budget.rows.map((row) => row.actual),
                      },
                    ]}
                  />
                ) : (
                  <Empty>
                    No approved HR monthly budget is available for{" "}
                    {DEFAULT_FISCAL_YEAR}.
                  </Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard
                title="Monthly HR Activity"
                subtitle="Candidates and leave requests created during the last 12 calendar months."
              >
                <GroupedBarGraph
                  options={baseChartOptions}
                  series={[
                    { name: "Candidates", data: monthlyActivity.candidates },
                    { name: "Leave requests", data: monthlyActivity.leaves },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Attendance Status"
                subtitle="Today’s team attendance distribution."
              >
                {attendanceStatus.length ? (
                  <DonutChart
                    centerLabel="Today"
                    labels={attendanceStatus.map(([label]) => label)}
                    series={attendanceStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, attendanceStatus.length)}
                    tooltipValue={attendanceStatus.map(
                      ([, value]) => `${value} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No attendance data is available today.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Recruitment Pipeline"
                subtitle="Candidates grouped by hiring status."
              >
                {recruitmentStatus.length ? (
                  <DonutChart
                    centerLabel="Candidates"
                    labels={recruitmentStatus.map(([label]) => label)}
                    series={recruitmentStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, recruitmentStatus.length)}
                    tooltipValue={recruitmentStatus.map(
                      ([, value]) => `${value} candidates`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No candidate pipeline data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Leave Request Status"
                subtitle="Employee leave requests grouped by decision status."
              >
                {leaveStatus.length ? (
                  <DonutChart
                    centerLabel="Leaves"
                    labels={leaveStatus.map(([label]) => label)}
                    series={leaveStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, leaveStatus.length)}
                    tooltipValue={leaveStatus.map(
                      ([, value]) => `${value} requests`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No leave-request data is available.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Employee Gender Distribution"
                subtitle="Active workforce grouped by recorded gender, following the WoNoV HR overview pattern."
              >
                {employeeGender.length ? (
                  <DonutChart
                    centerLabel="Employees"
                    labels={employeeGender.map(([label]) => label)}
                    series={employeeGender.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, employeeGender.length)}
                    tooltipValue={employeeGender.map(
                      ([, value]) => `${value} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No employee gender data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="City-wise Employees"
                subtitle="Workforce distribution using the employee home-city records available in HostPanel."
              >
                {employeeCity.length ? (
                  <DonutChart
                    centerLabel="Employees"
                    labels={employeeCity.map(([label]) => label)}
                    series={employeeCity.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, employeeCity.length)}
                    tooltipValue={employeeCity.map(
                      ([, value]) => `${value} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No employee city data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Payroll Status"
                subtitle="Current payroll-cycle employees grouped by payment status."
              >
                {payrollStatus.length ? (
                  <DonutChart
                    centerLabel="Payroll"
                    labels={payrollStatus.map(([label]) => label)}
                    series={payrollStatus.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, payrollStatus.length)}
                    tooltipValue={payrollStatus.map(
                      ([, value]) => `${value} employees`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No current payroll data is available.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="HR Document Types"
                subtitle="Employee vault documents grouped by document type or source."
              >
                {documentTypes.length ? (
                  <DonutChart
                    centerLabel="Documents"
                    labels={documentTypes.map(([label]) => label)}
                    series={documentTypes.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, documentTypes.length)}
                    tooltipValue={documentTypes.map(
                      ([, value]) => `${value} documents`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <Empty>No HR document data is available.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Recent Candidates"
                subtitle="Latest recruitment applications and current status."
                bodyClassName=""
              >
                {recentCandidates.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Candidate</th>
                          <th className="px-4 py-3">Position</th>
                          <th className="px-4 py-3">Applied</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentCandidates.map((candidate, index) => (
                          <tr
                            key={candidate.id || candidate.recordId || index}
                            className="text-[11px] text-slate-600 hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {candidate.name ||
                                candidate.fullName ||
                                "Unnamed candidate"}
                            </td>
                            <td className="px-4 py-3">
                              {candidate.positionApplied || "Not recorded"}
                            </td>
                            <td className="px-4 py-3">
                              {dateLabel(
                                candidate.createdAt || candidate.appliedAt,
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] ${statusTone(candidate.status)}`}
                              >
                                {readableLabel(candidate.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>No candidates are available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard
                title="Recent Leave Requests"
                subtitle="Latest employee requests requiring HR visibility."
                bodyClassName=""
              >
                {recentLeaves.length ? (
                  <div className="min-h-[240px] max-h-[360px] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis [&_th]:whitespace-nowrap">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Employee</th>
                          <th className="px-4 py-3">Leave type</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentLeaves.map((request, index) => (
                          <tr
                            key={request.id || request.recordId || index}
                            className="text-[11px] text-slate-600 hover:bg-blue-50/30"
                          >
                            <td className="px-5 py-3 text-slate-900">
                              {request.employeeName ||
                                request.name ||
                                "Employee"}
                            </td>
                            <td className="px-4 py-3">
                              {request.leaveType || "Leave"}
                            </td>
                            <td className="px-4 py-3">
                              {dateLabel(request.createdAt)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-[9px] ${statusTone(request.status)}`}
                              >
                                {readableLabel(request.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>No leave requests are available yet.</Empty>
                )}
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Attendance Correction Queue"
                subtitle="Latest punch-correction requests requiring HR review."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentCorrections}
                  emptyLabel="No attendance correction requests are available."
                  columns={[
                    {
                      label: "Employee",
                      render: (request) => (
                        <span className="text-slate-900">
                          {request.employeeName || request.name || "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Requested in",
                      render: (request) =>
                        request.requestedCheckIn || request.checkIn || "—",
                    },
                    {
                      label: "Requested out",
                      render: (request) =>
                        request.requestedCheckOut || request.checkOut || "—",
                    },
                    {
                      label: "Status",
                      render: (request) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(request.status)}`}
                        >
                          {readableLabel(request.status)}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Current Payroll Cycle"
                subtitle="Employee payouts and payment status for the active cycle."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentPayroll}
                  emptyLabel="No current payroll-cycle data is available."
                  columns={[
                    {
                      label: "Employee",
                      render: (employee) => (
                        <span className="text-slate-900">
                          {employee.employeeName ||
                            employee.name ||
                            employee.fullName ||
                            "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Net payable",
                      render: (employee) =>
                        currency(
                          numeric(
                            employee.financials?.netSalary ??
                              employee.netSalary ??
                              employee.netPayable,
                          ),
                        ),
                    },
                    {
                      label: "Department",
                      render: (employee) =>
                        employee.department || "Not recorded",
                    },
                    {
                      label: "Status",
                      render: (employee) => {
                        const status =
                          employee.payment?.status ||
                          employee.financials?.paymentStatus ||
                          "Pending";
                        return (
                          <span
                            className={`rounded-md px-2 py-1 text-[9px] ${statusTone(status)}`}
                          >
                            {readableLabel(status)}
                          </span>
                        );
                      },
                    },
                  ]}
                />
              </ChartCard>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Recent HR Documents"
                subtitle="Latest files available through the employee document vault."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentDocuments}
                  emptyLabel="No HR documents are available."
                  columns={[
                    {
                      label: "Document",
                      render: (document) => (
                        <span className="text-slate-900">
                          {document.name ||
                            document.fileName ||
                            "Employee document"}
                        </span>
                      ),
                    },
                    {
                      label: "Employee",
                      render: (document) =>
                        document.employeeName ||
                        document.ownerName ||
                        "Not recorded",
                    },
                    {
                      label: "Type",
                      render: (document) =>
                        readableLabel(
                          document.typeLabel ||
                            document.type ||
                            document.source ||
                            "Document",
                        ),
                    },
                    {
                      label: "Uploaded",
                      render: (document) =>
                        dateLabel(document.uploadedAt || document.createdAt),
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Recent Resignations"
                subtitle="Latest exit requests and active notice-period records."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentResignations}
                  emptyLabel="No resignation records are available."
                  columns={[
                    {
                      label: "Employee",
                      render: (request) => (
                        <span className="text-slate-900">
                          {request.employeeName || request.name || "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Department",
                      render: (request) => request.department || "Not recorded",
                    },
                    {
                      label: "Created",
                      render: (request) => dateLabel(request.createdAt),
                    },
                    {
                      label: "Status",
                      render: (request) => (
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] ${statusTone(request.status || request.statusLabel)}`}
                        >
                          {readableLabel(request.status || request.statusLabel)}
                        </span>
                      ),
                    },
                  ]}
                />
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="This Month's Birthdays"
                subtitle="Current-month employee celebrations from Company Management records."
                bodyClassName=""
              >
                <RecordsTable
                  records={birthdaysThisMonth}
                  emptyLabel="No employee birthdays are recorded this month."
                  columns={[
                    {
                      label: "Employee",
                      render: (employee) => (
                        <span className="flex items-center gap-2 text-slate-900">
                          <Cake size={14} className="text-pink-500" />
                          {employee.name || employee.fullName || "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Department",
                      render: (employee) =>
                        employee.department || "Not recorded",
                    },
                    {
                      label: "Birthday",
                      render: (employee) => dateLabel(employee.birthdayDate),
                    },
                    {
                      label: "Role",
                      render: (employee) =>
                        employee.designation ||
                        employee.jobTitle ||
                        employee.role ||
                        "Not recorded",
                    },
                  ]}
                />
              </ChartCard>
              <ChartCard
                title="Today's Attendance"
                subtitle="Latest check-in activity and attendance state for the HR team view."
                bodyClassName=""
              >
                <RecordsTable
                  records={recentAttendance}
                  emptyLabel="No attendance records are available today."
                  columns={[
                    {
                      label: "Employee",
                      render: (record) => (
                        <span className="text-slate-900">
                          {record.employeeName || record.name || "Employee"}
                        </span>
                      ),
                    },
                    {
                      label: "Check in",
                      render: (record) =>
                        record.checkInAt ||
                        record.checkIn ||
                        record.clockIn ||
                        "—",
                    },
                    {
                      label: "Check out",
                      render: (record) =>
                        record.checkOutAt ||
                        record.checkOut ||
                        record.clockOut ||
                        "—",
                    },
                    {
                      label: "Status",
                      render: (record) => {
                        const status =
                          record.displayStatus ||
                          record.status ||
                          (record.checkIn ? "Present" : "Absent");
                        return (
                          <span
                            className={`rounded-md px-2 py-1 text-[9px] ${statusTone(status)}`}
                          >
                            {readableLabel(status)}
                          </span>
                        );
                      },
                    },
                  ]}
                />
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
