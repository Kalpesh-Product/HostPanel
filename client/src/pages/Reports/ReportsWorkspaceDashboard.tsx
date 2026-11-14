import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  FileDown,
  FolderTree,
  Layers,
  LayoutList,
  Users,
} from "lucide-react";
import DashboardModuleCard from "../../components/DashboardModuleCard";
import DonutChart from "../../components/graphs/DonutChart";
import GroupedBarGraph from "../../components/graphs/GroupedBarGraph";
import PageFrame from "../../components/Pages/PageFrame";
import reportsBannerImage from "../../assets/reports-management-banner.jpg";
import { statusPillClass } from "../../lib/status-pill";
import { getReports } from "../../services/reports";

type ReportRecord = Record<string, any>;
type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "slate";

const readable = (value: unknown, fallback = "Not recorded") => {
  const text = String(value || "").trim();
  return text
    ? text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
};

const reportMonthKey = (report: ReportRecord) => {
  if (report.reportMonth) return report.reportMonth;
  const parsed = new Date(report.generatedAt || report.createdAt || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
};

const reportDepartment = (report: ReportRecord) =>
  String(report.department || "").trim() || "General";

const topGroups = (groups: Map<string, number>, limit = 5) => {
  const entries = [...groups.entries()].sort((left, right) => right[1] - left[1]);
  if (entries.length <= limit) return entries;
  const visible = entries.slice(0, limit);
  const remaining = entries
    .slice(limit)
    .reduce((sum, [, value]) => sum + value, 0);
  return [...visible, ["Others", remaining] as [string, number]];
};

const CATEGORY_COLORS: Record<string, string> = {
  attendance: "#2563EB",
  employee: "#06B6D4",
  financial: "#10B981",
  task: "#7C3AED",
  ticket: "#F59E0B",
  other: "#94A3B8",
};

function SectionCard({
  title,
  subtitle,
  children,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
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
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub: string;
  tone?: Tone;
}) {
  const tones: Record<Tone, { icon: string; hover: string }> = {
    blue: {
      icon: "border-l-blue-600 bg-blue-50 text-blue-700",
      hover: "hover:border-blue-200 hover:border-l-blue-600",
    },
    green: {
      icon: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
      hover: "hover:border-emerald-200 hover:border-l-emerald-500",
    },
    amber: {
      icon: "border-l-amber-500 bg-amber-50 text-amber-700",
      hover: "hover:border-amber-200 hover:border-l-amber-500",
    },
    violet: {
      icon: "border-l-violet-500 bg-violet-50 text-violet-700",
      hover: "hover:border-violet-200 hover:border-l-violet-500",
    },
    rose: {
      icon: "border-l-rose-500 bg-rose-50 text-rose-700",
      hover: "hover:border-rose-200 hover:border-l-rose-500",
    },
    slate: {
      icon: "border-l-slate-500 bg-slate-100 text-slate-700",
      hover: "hover:border-slate-300 hover:border-l-slate-500",
    },
  };

  return (
    <div
      className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${tones[tone].hover}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${tones[tone].icon}`}
      >
        {icon}
      </div>
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

const formatBadgeClass = (format: string) => {
  switch (String(format || "").toUpperCase()) {
    case "PDF":
      return "bg-red-50 text-red-700 border-red-200";
    case "EXCEL":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export default function ReportsWorkspaceDashboard() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getReports({ page: 1, limit: 1000 })
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data ?? response;
        setReports(
          Array.isArray(payload?.reports) ? payload.reports : [],
        );
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) {
          setReports([]);
          setLoadError("Report data could not be refreshed just now.");
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
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
    const countInMonth = (key: string) =>
      reports.filter((report) => reportMonthKey(report) === key).length;
    return {
      total: reports.length,
      thisMonth: countInMonth(thisMonthKey),
      prevMonth: countInMonth(prevMonthKey),
      pdf: reports.filter(
        (report) => String(report.format || "").toUpperCase() === "PDF",
      ).length,
      excel: reports.filter(
        (report) => String(report.format || "").toUpperCase() === "EXCEL",
      ).length,
      downloads: reports.reduce(
        (sum, report) => sum + (Number(report.downloadCount) || 0),
        0,
      ),
      categories: new Set(
        reports.map((report) => readable(report.category, "Other")),
      ).size,
      departments: new Set(
        reports.map((report) => reportDepartment(report)),
      ).size,
    };
  }, [reports]);

  const now = useMemo(() => new Date(), []);
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        new Date(
          now.getFullYear(),
          now.getMonth() - 5 + index,
          1,
        ).toLocaleDateString("en-US", { month: "short" }),
      ),
    [now],
  );

  const generationTrend = useMemo(() => {
    const generated = new Array(6).fill(0);
    reports.forEach((report) => {
      const [year, month] = reportMonthKey(report)
        .split("-")
        .map(Number);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      const monthsAgo =
        (now.getFullYear() - year) * 12 + now.getMonth() - (month - 1);
      if (monthsAgo < 0 || monthsAgo > 5) return;
      generated[5 - monthsAgo] += 1;
    });
    return generated;
  }, [reports, now]);

  const trendOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#2563EB"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light" },
  };

  const categoryRows = useMemo(() => {
    const groups = new Map<string, number>();
    reports.forEach((report) => {
      const label = readable(report.category, "Other");
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    const rows = topGroups(groups);
    return rows;
  }, [reports]);

  const departmentRows = useMemo(() => {
    const groups = new Map<string, number>();
    reports.forEach((report) => {
      const label = reportDepartment(report);
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return topGroups(groups);
  }, [reports]);

  const formatRows = useMemo(() => {
    const groups = new Map<string, number>();
    reports.forEach((report) => {
      const label = String(report.format || "").toUpperCase() || "Other";
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return topGroups(groups, 2);
  }, [reports]);

  const categoryColorFor = (label: string, index: number) =>
    CATEGORY_COLORS[label.toLowerCase()] ||
    ["#1E3D73", "#2563EB", "#60A5FA", "#10B981", "#F59E0B", "#94A3B8"][
      index % 6
    ];

  const recentReports = useMemo(
    () =>
      [...reports]
        .sort(
          (left, right) =>
            new Date(right.generatedAt || right.createdAt || 0).getTime() -
            new Date(left.generatedAt || left.createdAt || 0).getTime(),
        )
        .slice(0, 10),
    [reports],
  );

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={reportsBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3B82F6]/25 to-[#60A5FA]/15"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, transparent 32%, black 62%, black 100%)",
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
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
              <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Reports</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
                Report archive, generation activity, categories, formats, and
                download usage within your role and department scope.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Archive", "Categories", "Formats", "Downloads"].map(
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
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">
                Active modules
              </p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">1</p>
            </div>
          </div>
        </div>

        {loadError && !isLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={16} /> {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[112px] animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<Layers size={20} />}
              label="Total reports"
              value={stats.total}
              sub="Reports visible within your role scope"
            />
            <StatTile
              icon={<CalendarDays size={20} />}
              label="This month"
              value={stats.thisMonth}
              sub="Reports generated in the current month"
              tone="green"
            />
            <StatTile
              icon={<CalendarRange size={20} />}
              label="Previous month"
              value={stats.prevMonth}
              sub="Reports generated last month"
              tone="violet"
            />
            <StatTile
              icon={<FileText size={20} />}
              label="PDF reports"
              value={stats.pdf}
              sub="Reports stored in PDF format"
              tone="rose"
            />
            <StatTile
              icon={<FileSpreadsheet size={20} />}
              label="Excel reports"
              value={stats.excel}
              sub="Reports stored in Excel format"
              tone="green"
            />
            <StatTile
              icon={<FileDown size={20} />}
              label="Downloads"
              value={stats.downloads}
              sub="Total downloads across all reports"
              tone="amber"
            />
            <StatTile
              icon={<FolderTree size={20} />}
              label="Categories"
              value={stats.categories}
              sub="Report categories represented in the archive"
              tone="slate"
            />
            <StatTile
              icon={<Users size={20} />}
              label="Departments"
              value={stats.departments}
              sub="Departments represented in the archive"
              tone="blue"
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">
            Manage reports
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Open the report archive curated for your role and department scope.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:max-w-[1220px]">
            <DashboardModuleCard
              icon={<LayoutList size={19} />}
              title="Manage Reports"
              route="/extra-common-modules/reports/manage"
              description="Browse, preview, and download department reports as PDF or Excel"
              color="#2563EB"
              state={{ fromSection: "reports-dashboard", moduleTitle: "Manage Reports" }}
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <SectionCard
                title="Report generation trend"
                subtitle="Reports generated each month across the last six months."
              >
                {stats.total ? (
                  <GroupedBarGraph
                    options={trendOptions}
                    series={[{ name: "Reports generated", data: generationTrend }]}
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No report generation recorded yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Report categories"
                subtitle="Archive mix across attendance, employee, financial, task, and ticket reports."
              >
                {categoryRows.length ? (
                  <DonutChart
                    centerLabel="Reports"
                    labels={categoryRows.map(([label]) => label)}
                    series={categoryRows.map(([, value]) => value)}
                    colors={categoryRows.map(([label], index) =>
                      categoryColorFor(label, index),
                    )}
                    tooltipValue={categoryRows.map(
                      ([, value]) => `${value} reports`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No report category data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Department-wise reports"
                subtitle="Reports distributed across departments in your scope."
              >
                {departmentRows.length ? (
                  <DonutChart
                    centerLabel="Reports"
                    labels={departmentRows.map(([label]) => label)}
                    series={departmentRows.map(([, value]) => value)}
                    colors={["#1E3D73", "#2563EB", "#60A5FA", "#10B981", "#F59E0B", "#94A3B8"]}
                    tooltipValue={departmentRows.map(
                      ([, value]) => `${value} reports`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No department distribution data yet.
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard
                title="Export formats"
                subtitle="Archive split between PDF and Excel exports."
              >
                {formatRows.length ? (
                  <DonutChart
                    centerLabel="Reports"
                    labels={formatRows.map(([label]) => label)}
                    series={formatRows.map(([, value]) => value)}
                    colors={["#EF4444", "#10B981", "#94A3B8"]}
                    tooltipValue={formatRows.map(
                      ([, value]) => `${value} reports`,
                    )}
                    wrapLabels
                  />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-[11px] text-slate-500">
                    No format data yet.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Download usage"
                subtitle="Reports ranked by how often they have been downloaded."
                bodyClassName="max-h-[390px] overflow-y-auto p-0"
              >
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="w-[42%] px-5 py-3 font-pmedium">Report</th>
                      <th className="w-[28%] px-3 py-3 font-pmedium">Department</th>
                      <th className="w-[30%] px-3 py-3 text-center font-pmedium">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const downloaded = [...reports]
                        .sort(
                          (left, right) =>
                            (Number(right.downloadCount) || 0) -
                            (Number(left.downloadCount) || 0),
                        )
                        .slice(0, 8);
                      return downloaded.length ? (
                        downloaded.map((report, index) => (
                          <tr
                            key={report.recordId || `download-${index}`}
                            className="bg-white text-[11px] text-slate-600"
                          >
                            <td
                              className="truncate px-5 py-3 font-pmedium text-slate-900"
                              title={report.title || "Untitled report"}
                            >
                              {report.title || "Untitled report"}
                            </td>
                            <td
                              className="truncate px-3 py-3"
                              title={reportDepartment(report)}
                            >
                              {reportDepartment(report)}
                            </td>
                            <td className="px-3 py-3 text-center font-pmedium text-slate-800">
                              {Number(report.downloadCount) || 0}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-5 py-12 text-center text-[11px] text-slate-500"
                          >
                            No download activity recorded yet.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </SectionCard>
            </div>

            <SectionCard
              title="Recent reports"
              subtitle="Latest reports generated within your current role scope."
              bodyClassName="max-h-[390px] overflow-y-auto p-0"
            >
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[22%] px-5 py-3 font-pmedium">Report title</th>
                    <th className="w-[10%] px-3 py-3 font-pmedium">Report ID</th>
                    <th className="w-[12%] px-3 py-3 font-pmedium">Department</th>
                    <th className="w-[11%] px-3 py-3 font-pmedium">Category</th>
                    <th className="w-[10%] px-3 py-3 font-pmedium">Window</th>
                    <th className="w-[13%] px-3 py-3 font-pmedium">Generated by</th>
                    <th className="w-[9%] px-3 py-3 text-center font-pmedium">Format</th>
                    <th className="w-[13%] px-3 py-3 font-pmedium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReports.length ? (
                    recentReports.map((report, index) => (
                      <tr
                        key={report.recordId || report.id || `report-${index}`}
                        className="bg-white text-[11px] text-slate-600"
                      >
                        <td
                          className="truncate px-5 py-3 font-pmedium text-slate-900"
                          title={report.title || "Untitled report"}
                        >
                          {report.title || "Untitled report"}
                        </td>
                        <td
                          className="truncate px-3 py-3 text-[#2563EB]"
                          title={String(report.reportCode || report.recordId || "Not set")}
                        >
                          {report.reportCode || report.recordId || "Not set"}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={reportDepartment(report)}
                        >
                          {reportDepartment(report)}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={readable(report.category, "Other")}
                        >
                          {readable(report.category, "Other")}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={readable(report.dataWindow, "Monthly")}
                        >
                          {readable(report.dataWindow, "Monthly")}
                        </td>
                        <td
                          className="truncate px-3 py-3"
                          title={String(report.generatedBy || "Not recorded")}
                        >
                          {report.generatedBy || "Not recorded"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider ${formatBadgeClass(
                              report.format,
                            )}`}
                          >
                            {String(report.format || "PDF").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={statusPillClass(report.status || "Completed")}>
                            {readable(report.status, "Completed")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-[11px] text-slate-500"
                      >
                        No reports are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </SectionCard>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
