import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText, Search, ChevronDown, Download, Eye, Calendar,
  FileDown, FileSpreadsheet, X, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { downloadReport, getReports, getReportsFiltered } from '@/services/reports';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { downloadReportFile } from '@/utils/report-download';
import PageFrame from '@/components/Pages/PageFrame';

const REPORTS_PAGE_SIZE = 50;

interface MonthlyData {
  month: string;
  metric: string;
  value: string;
}

interface ReportRow {
  label: string;
  value: string;
}

interface Report {
  id: string;
  recordId: string;
  title: string;
  department?: string;
  category: string;
  dataWindow?: string;
  generatedBy: string;
  period: string;
  generatedDate: string;
  format: string;
  size: string;
  reportMonth?: string;
  description?: string;
  fileUrl?: string;
  fileSecureUrl?: string;
  downloadUrl?: string;
  monthlyData?: MonthlyData[];
  reportRows?: ReportRow[];
  createdAt?: string;
  updatedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

interface StatCard {
  label: string;
  value: number;
  cardClass: string;
}

interface ReportsPageProps {
  embedded?: boolean;
}

function deriveReportMonthKey(report: Report): string {
  if (report.reportMonth) return report.reportMonth;
  const fallbackDate = report.createdAt || report.updatedAt;
  const parsed = new Date(fallbackDate || '');
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return monthKey;
  const [year, month] = monthKey.split('-');
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(parsed.getTime())) return monthKey;
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getCategoryStyle(category: string) {
  switch (category) {
    case 'Attendance': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' };
    case 'Employee': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', iconBg: 'bg-cyan-100' };
    case 'Financial': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' };
    case 'Task': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconBg: 'bg-purple-100' };
    case 'Ticket': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', iconBg: 'bg-slate-100' };
  }
}

function getFormatStyle(format: string): string {
  switch (format) {
    case 'PDF': return 'bg-red-50 text-red-700 border-red-200';
    case 'Excel': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

const SESSION_STORAGE_KEY = 'reports_page_data';

function persistReportsPageData(data: { reports: Report[]; pagination: Pagination | null }) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch { /* noop */ }
}

function restoreReportsPageData(): { reports: Report[]; pagination: Pagination | null } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { reports: Report[]; pagination: Pagination | null };
  } catch { return null; }
}

export function ReportsPage({ embedded = false }: ReportsPageProps = {}) {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedReportMonth, setSelectedReportMonth] = useState('all');
  const [selectedDataWindow, setSelectedDataWindow] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isDownloadingReportId, setIsDownloadingReportId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);
  const [downloadPickerFormat, setDownloadPickerFormat] = useState('PDF');
  const [selectedDownloadDepartment, setSelectedDownloadDepartment] = useState('All Departments');
  const [selectedDownloadDataWindow, setSelectedDownloadDataWindow] = useState('all');
  const [departmentReports, setDepartmentReports] = useState<Report[]>([]);
  const [selectedDepartmentReportId, setSelectedDepartmentReportId] = useState('');
  const [isLoadingDepartmentReports, setIsLoadingDepartmentReports] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoadingMoreReports, setIsLoadingMoreReports] = useState(false);

  const loadReports = async (isMounted: { current: boolean }) => {
    setIsLoadingReports(true);
    setErrorMessage('');
    try {
      const response = await getReports({ page: 1, limit: REPORTS_PAGE_SIZE });
      if (!isMounted.current) return;
      const loadedReports = Array.isArray(response?.data?.reports) ? response.data.reports : [];
      const loadedPagination = response?.data?.pagination || null;
      setReports(loadedReports);
      setPagination(loadedPagination);
      persistReportsPageData({ reports: loadedReports, pagination: loadedPagination });
    } catch (error: any) {
      if (!isMounted.current) return;
      const restored = restoreReportsPageData();
      if (restored && restored.reports.length > 0) {
        setReports(restored.reports);
        setPagination(restored.pagination);
      }
      setErrorMessage(error?.message || 'Failed to load reports.');
    } finally {
      if (isMounted.current) setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    const restored = restoreReportsPageData();
    if (restored && restored.reports.length > 0) {
      setReports(restored.reports);
      setPagination(restored.pagination);
      setIsLoadingReports(false);
    }
    loadReports(isMounted);
    const handleRefreshReports = () => { loadReports(isMounted); };
    window.addEventListener('focus', handleRefreshReports);
    window.addEventListener('reports:refresh', handleRefreshReports);
    return () => {
      isMounted.current = false;
      window.removeEventListener('focus', handleRefreshReports);
      window.removeEventListener('reports:refresh', handleRefreshReports);
    };
  }, []);

  const handleLoadMoreReports = async () => {
    if (!pagination?.hasNextPage || isLoadingMoreReports) return;
    try {
      setIsLoadingMoreReports(true);
      const response = await getReports({ page: pagination.page + 1, limit: pagination.limit || REPORTS_PAGE_SIZE });
      const nextReports: Report[] = Array.isArray(response?.data?.reports) ? response.data.reports : [];
      setReports((current) => {
        const existingIds = new Set(current.map((r) => String(r.recordId)));
        const uniqueNextReports = nextReports.filter((r) => !existingIds.has(String(r.recordId)));
        const merged = [...current, ...uniqueNextReports];
        persistReportsPageData({ reports: merged, pagination: response?.data?.pagination || null });
        return merged;
      });
      setPagination(response?.data?.pagination || null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load more reports.');
    } finally {
      setIsLoadingMoreReports(false);
    }
  };

  useEffect(() => {
    const reportId = searchParams.get('reportId');
    if (!reportId || reports.length === 0) return;
    const match = reports.find((report) => report.recordId === reportId);
    if (match) setViewingReport(match);
  }, [searchParams, reports]);

  const reportDepartments = useMemo(
    () => ['all', ...Array.from(new Set(reports.map((r) => r.department || 'General').filter(Boolean)))],
    [reports],
  );

  const reportMonths = useMemo(() => {
    const values = reports.map((r) => r.reportMonth || deriveReportMonthKey(r)).filter(Boolean);
    return ['all', ...Array.from(new Set(values))];
  }, [reports]);

  const dataWindowOptions = ['all', 'Monthly', 'Quarterly', 'Annual', 'Custom'];

  const handleDownload = async (report: Report, forcedFormat?: string) => {
    if (!report?.recordId) {
      setErrorMessage('Unable to download this report right now.');
      return false;
    }
    setIsDownloadingReportId(report.recordId);
    setErrorMessage('');
    try {
      const response = await downloadReport(report.recordId, { format: forcedFormat || report.format });
      const downloadMeta = response?.data?.download;
      const updatedReport = response?.data?.report;
      await downloadReportFile(downloadMeta);
      if (updatedReport?.recordId) {
        setReports((previous) => previous.map((item) => (item.recordId === updatedReport.recordId ? updatedReport : item)));
        if (viewingReport?.recordId === updatedReport.recordId) setViewingReport(updatedReport);
      }
      return true;
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to download report.');
      return false;
    } finally {
      setIsDownloadingReportId('');
    }
  };

  const handleViewReport = (report: Report) => {
    const isExcelReport = String(report?.format || '').toLowerCase() === 'excel';
    if (isExcelReport) { setViewingReport(report); return; }
    const reportUrl = report?.fileUrl || report?.fileSecureUrl || report?.downloadUrl;
    if (!reportUrl) { setErrorMessage('This report does not have a viewable file yet.'); return; }
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadDepartments = useMemo(
    () => ['All Departments', ...Array.from(new Set(reports.map((r) => r.department || 'General').filter(Boolean)))],
    [reports],
  );

  const openDownloadPicker = (format: string) => {
    setDownloadPickerFormat(format);
    setSelectedDownloadDepartment('All Departments');
    setSelectedDownloadDataWindow('all');
    setSelectedDepartmentReportId('');
    setDepartmentReports([]);
    setShowDownloadPicker(true);
  };

  useEffect(() => {
    if (!showDownloadPicker) return;
    let isMounted = true;
    const loadDepartmentReports = async () => {
      setIsLoadingDepartmentReports(true);
      setErrorMessage('');
      try {
        const queryDepartment = selectedDownloadDepartment === 'All Departments' ? '' : selectedDownloadDepartment;
        const response = await getReportsFiltered({
          department: queryDepartment,
          dataWindow: selectedDownloadDataWindow,
          month: selectedReportMonth === 'all' ? '' : selectedReportMonth,
        });
        if (!isMounted) return;
        const loaded: Report[] = Array.isArray(response?.data?.reports) ? response.data.reports : [];
        setDepartmentReports(loaded);
        setSelectedDepartmentReportId(loaded[0]?.recordId || '');
      } catch (error: any) {
        if (!isMounted) return;
        setDepartmentReports([]);
        setSelectedDepartmentReportId('');
        setErrorMessage(error?.message || 'Failed to load department reports.');
      } finally {
        if (isMounted) setIsLoadingDepartmentReports(false);
      }
    };
    loadDepartmentReports();
    return () => { isMounted = false; };
  }, [showDownloadPicker, selectedDownloadDepartment, selectedDownloadDataWindow, selectedReportMonth]);

  const handlePickerDownload = async () => {
    const selected = departmentReports.find((r) => r.recordId === selectedDepartmentReportId);
    if (!selected) { setErrorMessage('Please select a report to download.'); return; }
    const success = await handleDownload(selected, downloadPickerFormat);
    if (success) setShowDownloadPicker(false);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesCategory = selectedCategory === 'all' || (report.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchesDepartment = selectedDepartment === 'all' || (report.department || '').toLowerCase() === selectedDepartment.toLowerCase();
      const reportMonthKey = deriveReportMonthKey(report);
      const matchesMonth = selectedReportMonth === 'all' || reportMonthKey === selectedReportMonth;
      const matchesDataWindow = selectedDataWindow === 'all' || (report.dataWindow || '').toLowerCase() === selectedDataWindow.toLowerCase();
      const matchesSearch = String(report.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        || String(report.generatedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesDepartment && matchesMonth && matchesDataWindow && matchesSearch;
    });
  }, [reports, selectedCategory, selectedDepartment, selectedReportMonth, selectedDataWindow, searchQuery]);

  const thisMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const prevMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const statCards: StatCard[] = useMemo(() => {
    const total = reports.length;
    const thisMonth = reports.filter((r) => {
      const key = r.reportMonth || deriveReportMonthKey(r);
      return key === thisMonthKey;
    }).length;
    const prevMonth = reports.filter((r) => {
      const key = r.reportMonth || deriveReportMonthKey(r);
      return key === prevMonthKey;
    }).length;
    const pdfCount = reports.filter((r) => String(r.format || '').toUpperCase() === 'PDF').length;

    return [
      {
        label: 'Total Reports', value: total,
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-400',
      },
      {
        label: 'This Month', value: thisMonth,
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500',
      },
      {
        label: 'Previous Month', value: prevMonth,
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500',
      },
      {
        label: 'PDF Reports', value: pdfCount,
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500',
      },
    ];
  }, [reports, thisMonthKey, prevMonthKey]);

  const isViewingExcelReport = String(viewingReport?.format || '').toLowerCase() === 'excel';

  const pageContent = (
    <>
      {isLoadingReports && <TablePageSkeleton />}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
        <div>
          <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
            Reports
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            View, preview and download structured department reports.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => openDownloadPicker('PDF')}
            className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
            <FileDown size={16} className="text-red-500"/>
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
          </button>
          <button onClick={() => openDownloadPicker('Excel')}
            className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 hover:text-emerald-600 transition-all active:scale-95 shadow-sm">
            <FileSpreadsheet size={16} className="text-emerald-500"/>
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
        {statCards.map((card) => (
          <div key={card.label} className={card.cardClass}>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-[15px] font-black text-slate-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-40">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm">
                <option value="all">All Categories</option>
                <option value="attendance">Attendance</option>
                <option value="employee">Employees</option>
                <option value="task">Tasks</option>
                <option value="ticket">Tickets</option>
                <option value="financial">Financial</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="relative w-full sm:w-48">
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm">
                <option value="all">All Departments</option>
                {reportDepartments.filter((dep) => dep !== 'all').map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="relative w-full sm:w-40">
              <select value={selectedReportMonth} onChange={(e) => setSelectedReportMonth(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm">
                <option value="all">All Months</option>
                {reportMonths.filter((month) => month !== 'all').map((month) => (
                  <option key={month} value={month}>{formatMonthLabel(month)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="relative w-full sm:w-40">
              <select value={selectedDataWindow} onChange={(e) => setSelectedDataWindow(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none cursor-pointer transition-all shadow-sm">
                <option value="all">All Data Windows</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" placeholder="Search reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4">Report Title</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Data Window</th>
                <th className="px-5 py-4">Generated By</th>
                <th className="px-5 py-4">Period</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Format</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filteredReports.map((report) => {
                const catStyle = getCategoryStyle(report.category);
                return (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 ${catStyle.iconBg} rounded-xl`}><FileText size={14} className={catStyle.text} /></div>
                        <div>
                          <p className="font-bold text-[#0F172A] text-[13px]">{report.title}</p>
                          <p className="text-[11px] font-semibold text-slate-400">{report.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">{report.department || 'General'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>{report.category}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">{report.dataWindow || 'Monthly'}</span>
                    </td>
                    <td className="px-5 py-4"><p className="text-[13px] font-bold text-[#0F172A]">{report.generatedBy}</p></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                        <Calendar size={13} className="text-slate-400" /> {report.period}
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-[12px] font-semibold text-slate-500">{report.generatedDate}</span></td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getFormatStyle(report.format)}`}>{report.format}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setViewingReport(report)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all" title="View Details">
                          <Eye size={15} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => handleDownload(report)} disabled={isDownloadingReportId === report.recordId}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed" title={`Download ${report.format}`}>
                          <Download size={15} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredReports.length === 0 && (
                <tr><td colSpan={9} className="text-center py-20 text-slate-400 font-semibold">No reports found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50/30">
          {filteredReports.map((report) => {
            const catStyle = getCategoryStyle(report.category);
            return (
              <div key={report.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${catStyle.iconBg} flex items-center justify-center ${catStyle.text}`}><FileText size={14} strokeWidth={2.5} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0F172A] text-sm leading-tight">{report.title}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{report.generatedBy}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${catStyle.bg} ${catStyle.text} border ${catStyle.border} shrink-0 ml-2`}>{report.category}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">Department: <span className="text-slate-700">{report.department || 'General'}</span></div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-semibold text-slate-600">
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Period</span>{report.period}</div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Format</span><span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${getFormatStyle(report.format)} border`}>{report.format}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Size</span>{report.size}</div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">Window</span>{report.dataWindow || 'Monthly'}</div>
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                  <button onClick={() => setViewingReport(report)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm">View</button>
                  <button onClick={() => handleDownload(report)} disabled={isDownloadingReportId === report.recordId}
                    className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
                    <Download size={12} /> {isDownloadingReportId === report.recordId ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredReports.length === 0 && (
            <div className="py-20 text-center text-sm font-semibold text-slate-400">No reports found.</div>
          )}
        </div>

        {pagination?.hasNextPage && (
          <div className="flex flex-col items-center gap-2 border-t border-slate-100/70 bg-white/70 px-4 py-5">
            <p className="text-[12px] font-semibold text-slate-500">Showing {reports.length} of {pagination?.total || reports.length} reports.</p>
            <button type="button" onClick={handleLoadMoreReports} disabled={isLoadingMoreReports}
              className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-[#2563EB] shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoadingMoreReports ? 'Loading...' : 'Load More Reports'}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewingReport && (
          <div className="fixed inset-0 z-999 flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewingReport(null)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:w-[min(92vw,56rem)] lg:w-[min(90vw,64rem)] max-h-[88vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col">
              <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
              <div className="px-6 py-4 md:p-8 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">Report Details</h2>
                <button onClick={() => setViewingReport(null)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <RowDetail label="Title" value={viewingReport.title} valueClass="text-right max-w-[60%]" />
                <RowDetail label="Department" value={viewingReport.department || 'General'} />
                <RowDetail label="Category" value={viewingReport.category} badge />
                <RowDetail label="Data Window" value={viewingReport.dataWindow || 'Monthly'} />
                <RowDetail label="Report Month" value={formatMonthLabel(viewingReport.reportMonth || deriveReportMonthKey(viewingReport)) || 'Not set'} />
                <RowDetail label="Generated By" value={viewingReport.generatedBy} />
                <RowDetail label="Period" value={viewingReport.period} icon={<Calendar size={14} className="text-slate-400" />} />
                <RowDetail label="Date" value={viewingReport.generatedDate} valueClass="text-slate-500 text-[12px]" />
                <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format / Size</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getFormatStyle(viewingReport.format)}`}>{viewingReport.format}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{viewingReport.size}</span>
                  </div>
                </div>
                {isViewingExcelReport && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                    Spreadsheet preview is shown below. Download the Excel file when you are ready.
                  </div>
                )}
                {viewingReport.description && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Eye size={12} /> Summary</span>
                    <div className="p-4 bg-slate-50 border border-slate-100/60 rounded-2xl italic font-semibold text-slate-700 text-[13px] leading-relaxed">&ldquo;{viewingReport.description}&rdquo;</div>
                  </div>
                )}
                {Array.isArray(viewingReport.monthlyData) && viewingReport.monthlyData.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Data</span>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <tr><th className="px-3 py-2">Month</th><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Value</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingReport.monthlyData.map((item, index) => (
                            <tr key={`${item.month}-${item.metric}-${index}`}>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-600">{item.month}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800">{item.metric}</td>
                              <td className="px-3 py-2 text-xs font-black text-blue-700">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {Array.isArray(viewingReport.reportRows) && viewingReport.reportRows.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Details</span>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <tr><th className="px-3 py-2">Label</th><th className="px-3 py-2">Value</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingReport.reportRows.map((item, index) => (
                            <tr key={`${item.label}-${index}`}>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-600">{item.label}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100/60 sticky bottom-0">
                <div className={`grid grid-cols-1 ${isViewingExcelReport ? '' : 'sm:grid-cols-2'} gap-3`}>
                  {!isViewingExcelReport && (
                    <button onClick={() => handleViewReport(viewingReport)}
                      className="w-full py-4 bg-white border border-slate-200 text-[#0F172A] rounded-xl font-black text-[13px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                      <Eye size={16} /> View
                    </button>
                  )}
                  <button onClick={() => handleDownload(viewingReport, viewingReport.format)} disabled={isDownloadingReportId === viewingReport.recordId}
                    className="w-full py-4 bg-[#2563EB] text-white rounded-xl font-black text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    <Download size={16} /> {isDownloadingReportId === viewingReport.recordId ? 'Downloading...' : `Download ${viewingReport.format}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDownloadPicker && (
          <div className="fixed inset-0 z-999 flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDownloadPicker(false)} className="absolute inset-0 bg-[#0F172A]/45 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.97 }} transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] w-full md:max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col">
              <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
              <div className="px-6 py-4 md:p-7 flex justify-between items-center border-b border-slate-100/60 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">Download Reports</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Select department, pick a report, and choose format.</p>
                </div>
                <button onClick={() => setShowDownloadPicker(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-6 md:p-7 space-y-5">
                <PickerField label="Department">
                  <select value={selectedDownloadDepartment} onChange={(e) => setSelectedDownloadDepartment(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none">
                    {downloadDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </PickerField>
                <PickerField label="Data Category">
                  <select value={selectedDownloadDataWindow} onChange={(e) => setSelectedDownloadDataWindow(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none">
                    {dataWindowOptions.map((w) => <option key={w} value={w}>{w === 'all' ? 'All Data Categories' : w}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </PickerField>
                <PickerField label="Report">
                  <select value={selectedDepartmentReportId} onChange={(e) => setSelectedDepartmentReportId(e.target.value)}
                    disabled={isLoadingDepartmentReports || departmentReports.length === 0}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200/60 rounded-xl font-bold text-[13px] text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none appearance-none disabled:opacity-60 disabled:cursor-not-allowed">
                    {departmentReports.length === 0 ? <option value="">No reports available</option> : departmentReports.map((r) => <option key={r.recordId} value={r.recordId}>{r.title} ({r.department || 'General'})</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  {isLoadingDepartmentReports && <p className="text-xs font-semibold text-blue-600">Loading department reports...</p>}
                </PickerField>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setDownloadPickerFormat('PDF')}
                      className={`py-2.5 rounded-xl border font-black text-xs uppercase tracking-widest transition-all ${downloadPickerFormat === 'PDF' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}>PDF</button>
                    <button onClick={() => setDownloadPickerFormat('Excel')}
                      className={`py-2.5 rounded-xl border font-black text-xs uppercase tracking-widest transition-all ${downloadPickerFormat === 'Excel' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>Excel</button>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-7 bg-slate-50/50 border-t border-slate-100/60 sticky bottom-0">
                <button onClick={handlePickerDownload} disabled={!selectedDepartmentReportId || isLoadingDepartmentReports || Boolean(isDownloadingReportId)}
                  className="w-full py-4 bg-[#2563EB] text-white rounded-xl font-black text-[13px] uppercase tracking-wider shadow-lg shadow-[#2563EB]/30 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  <Download size={16} /> {isDownloadingReportId ? 'Downloading...' : `Download ${downloadPickerFormat}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  if (embedded) return <>{pageContent}</>;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {pageContent}
        </div>
      </PageFrame>
    </div>
  );
}

function RowDetail({ label, value, valueClass, icon, badge }: {
  label: string; value: string; valueClass?: string; icon?: React.ReactNode; badge?: boolean;
}) {
  const catStyle = badge ? getCategoryStyle(value) : undefined;
  return (
    <div className="flex justify-between items-center pb-4 border-b border-slate-100/60">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {badge ? (
        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${catStyle?.bg} ${catStyle?.text} border ${catStyle?.border}`}>{value}</span>
      ) : (
        <span className={`font-bold text-[#0F172A] text-[13px] ${valueClass || ''} flex items-center gap-1.5`}>{icon}{icon ? <>{value}</> : value}</span>
      )}
    </div>
  );
}

function PickerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}
