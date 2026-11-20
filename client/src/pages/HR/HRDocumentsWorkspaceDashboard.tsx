import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, FileCheck2, Files, FolderOpen, UserCheck, UserMinus, Users } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import DashboardModuleCard from "@/components/DashboardModuleCard";
import DonutChart from "@/components/graphs/DonutChart";
import PageFrame from "@/components/Pages/PageFrame";
import documentsBannerImage from "@/assets/hr-documents-dashboard-banner.png";
import { getEmployeeDocumentsVault } from "@/services/hr";
import { DashboardBanner, DashboardSection, DashboardStatTile } from "../Administration/AdministrationModuleDashboardShared";

type EmployeeRecord = Record<string, any>;
type DocumentRecord = Record<string, any>;
const inactiveStatuses = new Set(["inactive", "terminated", "disabled"]);
const pretty = (value: unknown, fallback = "Document") => String(value || fallback).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const documentType = (document: DocumentRecord) => {
  const type = String(document.type || "").toLowerCase();
  const name = String(document.name || "").toLowerCase();
  if (type.includes("medical") || name.includes("medical")) return "Medical Certificate";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (type.includes("image") || /\.(png|jpe?g|webp|gif)$/i.test(name)) return "Image";
  if (type.includes("word") || /\.docx?$/i.test(name)) return "Word";
  if (type.includes("sheet") || /\.(xlsx?|csv)$/i.test(name)) return "Spreadsheet";
  return pretty(type);
};
const dateValue = (value: unknown) => { const date = new Date(String(value || "")); return Number.isNaN(date.getTime()) ? null : date; };

export default function HRDocumentsWorkspaceDashboard() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getEmployeeDocumentsVault()
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.data || response?.data || {};
        const nextEmployees = Array.isArray(payload.employees) ? payload.employees : [];
        const nextDocuments = Array.isArray(payload.documents)
          ? payload.documents
          : nextEmployees.flatMap((employee: EmployeeRecord) =>
              Array.isArray(employee.documents)
                ? employee.documents.map((document: DocumentRecord) => ({ ...document, employeeId: employee.employeeId || employee.id, employeeName: employee.fullName || employee.name, employeeDepartment: employee.department }))
                : [],
            );
        setEmployees(nextEmployees);
        setDocuments(nextDocuments);
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) {
          setEmployees([]);
          setDocuments([]);
          setLoadError(error?.message || "Document vault data could not be refreshed just now.");
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const activeEmployees = employees.filter((employee) => !inactiveStatuses.has(String(employee.statusKey || employee.status || "").toLowerCase()));
    const inactiveEmployees = employees.length - activeEmployees.length;
    const employeesWithDocuments = employees.filter((employee) => Array.isArray(employee.documents) && employee.documents.length > 0).length;
    const missingDocuments = Math.max(0, employees.length - employeesWithDocuments);
    const departments = new Set(employees.map((employee) => employee.department).filter(Boolean)).size;
    const medical = documents.filter((document) => documentType(document) === "Medical Certificate").length;
    return { employees: employees.length, activeEmployees: activeEmployees.length, inactiveEmployees, documents: documents.length, employeesWithDocuments, missingDocuments, departments, medical };
  }, [documents, employees]);

  const typeRows = useMemo(() => {
    const groups = new Map<string, number>();
    documents.forEach((document) => { const key = documentType(document); groups.set(key, (groups.get(key) || 0) + 1); });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [documents]);

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    documents.forEach((document) => { const key = String(document.employeeDepartment || "Not assigned"); groups.set(key, (groups.get(key) || 0) + 1); });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [documents]);

  const monthlyUploads = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1); return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), uploads: 0 }; });
    const byMonth = new Map(months.map((month) => [month.key, month]));
    documents.forEach((document) => { const date = dateValue(document.uploadedAt || document.createdAt || document.uploadDate); if (!date) return; const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; const month = byMonth.get(key); if (month) month.uploads += 1; });
    return months;
  }, [documents]);

  const departmentCoverage = useMemo(() => {
    const groups = new Map<string, { total: number; covered: number }>();
    employees.forEach((employee) => { const department = String(employee.department || "Not assigned"); const values = groups.get(department) || { total: 0, covered: 0 }; values.total += 1; if (Array.isArray(employee.documents) && employee.documents.length > 0) values.covered += 1; groups.set(department, values); });
    return [...groups.entries()].map(([department, values]) => ({ department, coverage: values.total ? Math.round((values.covered / values.total) * 100) : 0 })).sort((left, right) => right.coverage - left.coverage).slice(0, 8);
  }, [employees]);

  const missingFileEmployees = useMemo(() => employees.filter((employee) => !inactiveStatuses.has(String(employee.statusKey || employee.status || "").toLowerCase()) && (!Array.isArray(employee.documents) || employee.documents.length === 0)).slice(0, 8), [employees]);

  const uploadChartOptions = useMemo(() => ({ chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "Poppins, sans-serif" }, colors: ["#7C3AED"], dataLabels: { enabled: false }, stroke: { curve: "smooth" as const, width: 3 }, fill: { type: "gradient", gradient: { opacityFrom: 0.28, opacityTo: 0.04, stops: [0, 95, 100] } }, grid: { borderColor: "#E2E8F0", strokeDashArray: 4 }, xaxis: { categories: monthlyUploads.map((month) => month.label), labels: { style: { colors: "#64748B", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } }, yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: "#64748B", fontSize: "10px" }, formatter: (value: number) => String(Math.round(value)) } }, tooltip: { y: { formatter: (value: number) => `${value} documents uploaded` } } }), [monthlyUploads]);

  const coverageChartOptions = useMemo(() => ({ chart: { toolbar: { show: false }, fontFamily: "Poppins, sans-serif" }, colors: ["#2563EB"], plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "48%" } }, dataLabels: { enabled: true, formatter: (value: number) => `${Math.round(value)}%`, style: { colors: ["#FFFFFF"], fontSize: "10px", fontWeight: 500 } }, grid: { borderColor: "#E2E8F0", strokeDashArray: 4 }, xaxis: { categories: departmentCoverage.map((row) => row.department), min: 0, max: 100, tickAmount: 4, labels: { style: { colors: "#64748B", fontSize: "10px" }, formatter: (value: string) => `${Math.round(Number(value))}%` } }, yaxis: { labels: { maxWidth: 135, style: { colors: "#475569", fontSize: "10px" } } }, tooltip: { y: { formatter: (value: number) => `${Math.round(value)}% employees covered` } } }), [departmentCoverage]);

  const recentDocuments = useMemo(() => [...documents].sort((left, right) => new Date(right.uploadedAt || right.createdAt || 0).getTime() - new Date(left.uploadedAt || left.createdAt || 0).getTime()).slice(0, 10), [documents]);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <DashboardBanner title="Documents" description="A live view of employee files, document coverage, vault activity, departments, and records that still need attention." tags={["Vault", "Employee Files", "Coverage", "Compliance"]} image={documentsBannerImage} moduleCount={2} />
        {loadError && !isLoading ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">{loadError}</div> : null}
        {isLoading ? <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />)}</div> : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatTile icon={<Files size={20} />} label="Total Documents" value={stats.documents} sub="Files stored in the employee vault" tone="blue" />
            <DashboardStatTile icon={<Users size={20} />} label="Employees" value={stats.employees} sub="People represented in the vault" tone="cyan" />
            <DashboardStatTile icon={<CheckCircle2 size={20} />} label="Active Employees" value={stats.activeEmployees} sub="Current employee records" tone="green" />
            <DashboardStatTile icon={<UserMinus size={20} />} label="Inactive Employees" value={stats.inactiveEmployees} sub="Archived workforce records" tone="slate" />
            <DashboardStatTile icon={<FileCheck2 size={20} />} label="With Documents" value={stats.employeesWithDocuments} sub="Employees with at least one file" tone="green" />
            <DashboardStatTile icon={<Archive size={20} />} label="Missing Files" value={stats.missingDocuments} sub="Employees without uploaded files" tone="amber" />
            <DashboardStatTile icon={<FolderOpen size={20} />} label="Departments" value={stats.departments} sub="Departments represented in the vault" tone="violet" />
            <DashboardStatTile icon={<FileCheck2 size={20} />} label="Medical Files" value={stats.medical} sub="Medical certificates on record" tone="rose" />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Document vault modules</p>
          <p className="mt-1 text-[10px] text-slate-500">Open the active or archived employee record set directly.</p>
          <div className="mt-3 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <DashboardModuleCard icon={<UserCheck size={19} />} title="Active Employee Documents" route="/department-accesses/hr-department/documents/active-employees" description="Review files for employees currently active in the unit" color="#10B981" />
            <DashboardModuleCard icon={<UserMinus size={19} />} title="Inactive Employee Documents" route="/department-accesses/hr-department/documents/inactive-employees" description="Access document records for inactive and terminated employees" color="#7C3AED" />
          </div>
        </div>

        {!isLoading ? <>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection title="Documents by type" subtitle="File-format and document-category mix across the vault.">{typeRows.length ? <DonutChart centerLabel="Documents" labels={typeRows.map(([name]) => name)} series={typeRows.map(([, value]) => value)} colors={["#7C3AED", "#2563EB", "#10B981", "#F59E0B", "#06B6D4", "#94A3B8"]} tooltipValue={typeRows.map(([, value]) => `${value} documents`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No documents uploaded yet.</div>}</DashboardSection>
            <DashboardSection title="Documents by department" subtitle="Vault coverage across company departments.">{departmentRows.length ? <DonutChart centerLabel="Documents" labels={departmentRows.map(([name]) => name)} series={departmentRows.map(([, value]) => value)} colors={["#2563EB", "#0D9488", "#7C3AED", "#F59E0B", "#EF4444", "#94A3B8"]} tooltipValue={departmentRows.map(([, value]) => `${value} documents`)} wrapLabels /> : <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">No department document data recorded yet.</div>}</DashboardSection>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardSection title="Six-month upload activity" subtitle="Employee documents added to the vault by month.">
              <ReactApexChart type="area" height={310} options={uploadChartOptions} series={[{ name: "Documents uploaded", data: monthlyUploads.map((month) => month.uploads) }]} />
            </DashboardSection>
            <DashboardSection title="Employee file coverage by department" subtitle="Share of employees with at least one document on record.">
              {departmentCoverage.length ? <ReactApexChart type="bar" height={310} options={coverageChartOptions} series={[{ name: "Employee coverage", data: departmentCoverage.map((row) => row.coverage) }]} /> : <div className="flex h-[310px] items-center justify-center text-[11px] text-slate-500">No department file coverage is available yet.</div>}
            </DashboardSection>
          </div>
          <DashboardSection title="Missing-file attention" subtitle="Employee records without any uploaded documents." bodyClassName="p-0">
            {missingFileEmployees.length ? <div className="divide-y divide-slate-100">{missingFileEmployees.map((employee, index) => <div key={employee.id || employee._id || index} className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_190px_130px] sm:items-center"><div className="min-w-0"><p className="truncate text-[11px] font-pmedium text-slate-900">{employee.fullName || employee.name || "Employee"}</p><p className="mt-1 truncate text-[9px] text-slate-500">{employee.employeeId || employee.email || "Employee record"}</p></div><p className="truncate text-[10px] text-slate-600">{employee.department || "Not assigned"}</p><div className="sm:text-right"><span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-pmedium uppercase text-amber-700">Files missing</span></div></div>)}</div> : <div className="flex min-h-[145px] items-center justify-center px-5 py-10 text-[11px] text-slate-500">Every employee currently has at least one document on record.</div>}
          </DashboardSection>
          <div className="mt-4">
          <DashboardSection title="Recent documents" subtitle="Latest files added to employee records." bodyClassName="max-h-[420px] overflow-auto p-0">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left"><thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-[32%] px-5 py-3 font-pmedium">Document</th><th className="w-[25%] px-3 py-3 font-pmedium">Employee</th><th className="w-[18%] px-3 py-3 font-pmedium">Department</th><th className="w-[15%] px-3 py-3 font-pmedium">Type</th><th className="w-[10%] px-3 py-3 text-center font-pmedium">Source</th></tr></thead><tbody className="divide-y divide-slate-100">
              {recentDocuments.length ? recentDocuments.map((document, index) => <tr key={document.id || document.publicId || index} className="bg-white text-[11px] text-slate-600"><td className="px-5 py-3"><p className="truncate font-pmedium text-slate-900">{document.name || "Employee Document"}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{document.uploadDate || "Stored in document vault"}</p></td><td className="truncate px-3 py-3">{document.employeeName || "Employee"}</td><td className="truncate px-3 py-3">{document.employeeDepartment || "Not assigned"}</td><td className="px-3 py-3">{documentType(document)}</td><td className="px-3 py-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-pmedium uppercase text-slate-600">{document.source || "Vault"}</span></td></tr>) : <tr><td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">No documents uploaded yet.</td></tr>}
            </tbody></table>
          </DashboardSection>
          </div>
        </> : null}
      </PageFrame>
    </div>
  );
}
