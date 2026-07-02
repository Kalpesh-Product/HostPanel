import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Receipt, Building2, Calendar, CreditCard, CheckCircle2,
  XCircle, Search, FileText, ArrowRight, X, Clock, Eye,
  IndianRupee, PieChart, Users, LayoutGrid, FileCheck, Send, Banknote, Globe, User, FileDown, FileSpreadsheet
} from 'lucide-react';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { createReport } from '@/services/reports';
import {
  generatePayrollPayslip,
  getPayrollSnapshot,
  getTenantBillingSnapshot,
  generateTenantSecurityDepositInvoice,
  markTenantSecurityDepositPaid,
  processPayrollPayment,
  resetTenantSecurityDepositInvoice,
  sendPayrollPayslip,
  sendTenantSecurityDepositInvoice,
} from '@/services/finance';
import {
  generateMeetingRoomInvoice,
  getMeetingRoomBookings,
  resetMeetingRoomInvoice,
  sendMeetingRoomInvoice,
} from '@/services/meeting-room-bookings';
import { getTenantCompanies, updateTenantCompanyCreditRequest } from '@/services/tenant-companies';
import { downloadReportFile } from '@/utils/report-download';
import { getStoredUser } from '@/lib/auth-session';
import { DEFAULT_FISCAL_YEAR, getFiscalYearOptions } from '@/features/finance/utils/fiscalYear';
import PageFrame from '@/components/Pages/PageFrame';

/* ───────────────────── Types ───────────────────── */

interface TenantBillingRecord {
  id: string;
  recordId: string;
  company: string;
  package: string;
  packageName: string;
  seats: number;
  contractDurationMonths: number;
  cycle: string;
  amount: number;
  monthlyRent: number;
  totalContractAmount: number;
  securityDepositAmount: number;
  securityDepositPaidStatus: string;
  invoiceNumber: string;
  invoiceFileName: string;
  invoiceFileUrl: string;
  invoiceStatus: string;
  invoiceGeneratedAt: string;
  invoiceSentAt: string;
  invoiceSentToEmail: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface BookingRecord {
  id: string;
  recordId?: string;
  bookingCode?: string;
  bookedByName?: string;
  clientCompany?: string;
  roomName?: string;
  resourceName?: string;
  date?: string;
  dateLabel?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timeSlot?: string;
  paymentMode?: string;
  transactionId?: string;
  invoiceStatus?: string;
  invoiceNumber?: string;
  invoiceFileUrl?: string;
  paymentStatus?: string;
  totalAmount?: number;
  amount?: number;
  originalTotalAmount?: number;
  bookingType?: string;
  bookingSource?: string;
  paymentVerificationStatus?: string;
  paymentProofUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  invoiceSentAt?: string;
}

interface PayrollEmployee {
  id: string;
  name: string;
  employeeId?: string;
  profileId?: string;
  department?: string;
  cycleId?: string;
  financials?: {
    netSalary?: number;
    paymentStatus?: string;
    payslipId?: string;
  };
  payment?: {
    status?: string;
    bankDetails?: Record<string, any>;
  };
  payslip?: {
    id?: string;
    fileUrl?: string;
    payslipUrl?: string;
    url?: string;
  };
  bankDetails?: Record<string, any>;
  accountNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  accountNumberMasked?: string;
}

interface PayrollCycle {
  id?: string;
  cycleKey?: string;
  displayMonth?: string;
  monthLabel?: string;
  year?: string;
  month?: string;
  status?: string;
  employees?: PayrollEmployee[];
  summary?: {
    totalEmployees?: number;
    totalNetPayable?: number;
  };
}

interface PayrollSnapshotData {
  currentCycle: PayrollCycle | null;
  history: PayrollCycle[];
  payments: any[];
  payslips: any[];
  filters: { departments: string[]; roles: string[] };
}

interface ExtraCreditRequest {
  id?: string;
  _id?: string;
  tenantCompanyId?: string;
  tenantCompanyName?: string;
  tenantCompanyCode?: string;
  requestedCredits?: number;
  totalAmount?: number;
  status?: string;
  paymentTransactionId?: string;
  paymentProofFileUrl?: string;
  invoiceNumber?: string;
  invoiceFileUrl?: string;
  paymentFailureReason?: string;
  paymentSubmittedAtAt?: string;
  updatedAtAt?: string;
  updatedAt?: string;
  createdAt?: string;
  requestedByName?: string;
}

interface TransactionEntry {
  id: string;
  type: string;
  entity: string;
  amount: number;
  date: string;
  mode?: string;
  ref?: string;
  details?: string;
}

/* ───────────────────── Constants / Helpers ───────────────────── */

function getCreditRequestStatusLabel(status = ''): string {
  const labels: Record<string, string> = {
    PENDING_SALES_APPROVAL: 'Pending Sales Approval',
    APPROVED_AWAITING_PAYMENT: 'Approved / Awaiting Payment',
    PAYMENT_SUBMITTED: 'Payment Submitted',
    PAYMENT_CONFIRMED: 'Payment Confirmed',
    INVOICE_GENERATED: 'Invoice Generated',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    PAYMENT_FAILED: 'Payment Failed',
    PAYMENT_REJECTED: 'Payment Rejected',
  };
  return labels[status] || String(status || 'Pending');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function parseFiscalYearRange(fiscalYear = DEFAULT_FISCAL_YEAR): { start: Date; end: Date } {
  const match = String(fiscalYear || '').match(/FY\s*(\d{2,4})-(\d{2,4})/i);
  if (!match) {
    const now = new Date();
    const currentYear = now.getFullYear();
    return { start: new Date(currentYear, 3, 1), end: new Date(currentYear + 1, 2, 31, 23, 59, 59, 999) };
  }
  const startYear = Number(match[1].length === 2 ? `20${match[1]}` : match[1]);
  const endYear = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);
  return { start: new Date(startYear, 3, 1), end: new Date(endYear, 2, 31, 23, 59, 59, 999) };
}

function isDateInFiscalYear(value: string | Date | null | undefined, fiscalYear = DEFAULT_FISCAL_YEAR): boolean {
  if (!value) return false;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const range = parseFiscalYearRange(fiscalYear);
  return parsed >= range.start && parsed <= range.end;
}

function getStatusBadge(status: string) {
  if (!status) return <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Unknown</span>;
  if (status.includes('Paid') || status.includes('Completed') || status.includes('Confirmed') || status.includes('Generated') || status.includes('Done'))
    return <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{status}</span>;
  if (status.includes('Pending') || status.includes('Awaiting') || status.includes('Submitted'))
    return <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider animate-pulse">{status}</span>;
  if (status.includes('Rejected') || status.includes('Failed'))
    return <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{status}</span>;
  return <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{status}</span>;
}

/* ───────────────────── Report builders ───────────────────── */

function buildTenantBillingReportRows(records: any[] = [], filters: Record<string, any> = {}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Tenant Security Deposits' },
    { label: 'Record Count', value: String(records.length) },
    { label: 'Fiscal Year', value: filters.fiscalYear || DEFAULT_FISCAL_YEAR },
    { label: 'Status Filter', value: filters.statusFilter || 'All' },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];
  records.forEach((record: any, index: number) => {
    rows.push({
      label: `${index + 1}. ${record.company || 'Tenant'} | ${record.packageName || record.package || 'Package'}`,
      value: [
        `Package: ${record.packageName || record.package || '-'}`,
        `Security Deposit: ${formatCurrency(record.securityDepositAmount || 0)}`,
        `Monthly Rent: ${formatCurrency(record.monthlyRent || 0)}`,
        `Contract: ${record.contractDurationMonths || 0} month(s)`,
        record.dueDate ? `Due Date: ${record.dueDate}` : '',
        record.invoiceNumber ? `Invoice: ${record.invoiceNumber}` : 'Invoice: Pending',
        `Invoice Status: ${record.invoiceStatus || 'Pending'}`,
        `Payment Status: ${record.securityDepositPaidStatus || 'Pending'}`,
        record.startDate ? `Start Date: ${record.startDate}` : '',
        record.endDate ? `End Date: ${record.endDate}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildBookingReportRows(records: any[] = [], filters: Record<string, any> = {}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'External Bookings' },
    { label: 'Record Count', value: String(records.length) },
    { label: 'Fiscal Year', value: filters.fiscalYear || DEFAULT_FISCAL_YEAR },
    { label: 'Status Filter', value: filters.statusFilter || 'All' },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];
  records.forEach((record: any, index: number) => {
    rows.push({
      label: `${index + 1}. ${record.bookedByName || 'Guest'} | ${record.roomName || record.resourceName || 'Room'}`,
      value: [
        `Booked By: ${record.bookedByName || '-'}`,
        record.clientCompany ? `Company: ${record.clientCompany}` : 'Company: External Booking',
        record.date ? `Date: ${record.date}` : '',
        record.paymentMode ? `Payment Mode: ${record.paymentMode}` : '',
        record.transactionId ? `Transaction ID: ${record.transactionId}` : '',
        `Invoice Status: ${record.invoiceStatus || 'Pending'}`,
        record.invoiceNumber ? `Invoice: ${record.invoiceNumber}` : 'Invoice: Pending',
        `Payment Status: ${record.paymentStatus || 'Pending'}`,
        `Amount: ${formatCurrency(record.totalAmount || record.amount || 0)}`,
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildPayrollReportRows(records: any[] = [], cycle: PayrollCycle | null = null, payrollCycleHistory: any[] = [], filters: Record<string, any> = {}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Payroll' },
    { label: 'Cycle', value: cycle?.displayMonth || cycle?.monthLabel || 'Current Cycle' },
    { label: 'Record Count', value: String(records.length) },
    { label: 'Fiscal Year', value: filters.fiscalYear || DEFAULT_FISCAL_YEAR },
    { label: 'Status Filter', value: filters.statusFilter || 'All' },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
    { label: 'Past Cycles', value: String(Array.isArray(payrollCycleHistory) ? payrollCycleHistory.length : 0) },
  ];
  records.forEach((employee: any, index: number) => {
    const paymentStatus = String(employee.payment?.status || employee.financials?.paymentStatus || 'Pending');
    rows.push({
      label: `${index + 1}. ${employee.name || 'Employee'} | Dept: ${employee.department || 'N/A'}`,
      value: [
        employee.department ? `Department: ${employee.department}` : '',
        `Net Salary: ${formatCurrency(employee.financials?.netSalary || 0)}`,
        `Payment Status: ${paymentStatus}`,
        employee.bankDetails?.bankName ? `Bank: ${employee.bankDetails.bankName}` : '',
        employee.bankDetails?.accountHolderName ? `Account Holder: ${employee.bankDetails.accountHolderName}` : '',
        employee.bankDetails?.accountNumber ? `Account Number: ${employee.bankDetails.accountNumber}` : '',
        employee.bankDetails?.ifscCode ? `IFSC: ${employee.bankDetails.ifscCode}` : '',
        employee.payslip?.id ? `Payslip: ${employee.payslip.id}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildExtraCreditReportRows(records: any[] = [], filters: Record<string, any> = {}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Extra Credit Requests' },
    { label: 'Record Count', value: String(records.length) },
    { label: 'Fiscal Year', value: filters.fiscalYear || DEFAULT_FISCAL_YEAR },
    { label: 'Status Filter', value: filters.statusFilter || 'All' },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];
  records.forEach((record: any, index: number) => {
    rows.push({
      label: `${index + 1}. ${record.tenantCompanyName || record.tenantCompanyCode || 'Tenant'}`,
      value: [
        `Tenant Code: ${record.tenantCompanyCode || '-'}`,
        `Requested Credits: ${record.requestedCredits || 0}`,
        `Total Amount: ${formatCurrency(record.totalAmount || 0)}`,
        `Status: ${getCreditRequestStatusLabel(record.status)}`,
        record.paymentTransactionId ? `Transaction: ${record.paymentTransactionId}` : '',
        record.invoiceNumber ? `Invoice: ${record.invoiceNumber}` : 'Invoice: Pending',
        record.paymentFailureReason ? `Failure: ${record.paymentFailureReason}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

function buildHistoryReportRows(records: any[] = [], filters: Record<string, any> = {}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Report Scope', value: 'Transaction History' },
    { label: 'Record Count', value: String(records.length) },
    { label: 'Fiscal Year', value: filters.fiscalYear || DEFAULT_FISCAL_YEAR },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];
  records.forEach((record: any, index: number) => {
    rows.push({
      label: `${index + 1}. ${record.entity || 'Entity'} | ${record.type || 'Transaction'}`,
      value: [
        record.date ? `Date: ${record.date}` : '',
        record.entity ? `Entity: ${record.entity}` : '',
        `Amount: ${formatCurrency(record.amount || 0)}`,
        record.ref ? `Reference: ${record.ref}` : '',
        record.details ? `Details: ${record.details}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows.slice(0, 200);
}

/* ───────────────────── Main Component ───────────────────── */

export function BillingPaymentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const fiscalYearOptions = useMemo(() => getFiscalYearOptions(), []);
  const [selectedFY, setSelectedFY] = useState(DEFAULT_FISCAL_YEAR);
  const currentUser = getStoredUser();
  const currentUserName = String(
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.email ||
    'Finance Team',
  ).trim();

  const [activeTab, setActiveTab] = useState('tenant');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [tenantBills, setTenantBills] = useState<TenantBillingRecord[]>([]);
  const [bookingRecords, setBookingRecords] = useState<BookingRecord[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollSnapshotData | null>(null);
  const [extraCreditRequests, setExtraCreditRequests] = useState<ExtraCreditRequest[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const [viewingTenantBill, setViewingTenantBill] = useState<TenantBillingRecord | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingRecord | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<PayrollEmployee | null>(null);
  const [viewingExtraCredit, setViewingExtraCredit] = useState<ExtraCreditRequest | null>(null);
  const [viewingInvoiceUrl, setViewingInvoiceUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const tabs = [
    { key: 'tenant', label: 'TENANT SECURITY DEPOSITS', icon: Building2 },
    { key: 'bookings', label: 'MEETING ROOM BOOKINGS', icon: Calendar },
    { key: 'payroll', label: 'PAYROLL', icon: Users },
    { key: 'extraCredits', label: 'EXTRA CREDIT REQUESTS', icon: CreditCard },
    { key: 'history', label: 'TRANSACTION HISTORY', icon: Clock },
  ];

  /* ── Load data ── */

  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [billingRes, bookingRes, payrollRes, creditRes] = await Promise.allSettled([
          getTenantBillingSnapshot(selectedFY),
          getMeetingRoomBookings({ fiscalYear: selectedFY }),
          getPayrollSnapshot(selectedFY),
          getTenantCompanies({ fiscalYear: selectedFY }),
        ]);

        if (!alive) return;

        if (billingRes.status === 'fulfilled') {
          const data = billingRes.value?.data?.data || billingRes.value?.data || [];
          setTenantBills(Array.isArray(data) ? data : []);
        }

        if (bookingRes.status === 'fulfilled') {
          const data = bookingRes.value?.data?.data || bookingRes.value?.data || [];
          setBookingRecords(Array.isArray(data) ? data : []);
        }

        if (payrollRes.status === 'fulfilled') {
          const data = payrollRes.value?.data?.data || payrollRes.value?.data || null;
          setPayrollData(data);
        }

        if (creditRes.status === 'fulfilled') {
          const resData = creditRes.value?.data?.data || creditRes.value?.data || [];
          const companies = Array.isArray(resData) ? resData : [];
          const creditRequests: ExtraCreditRequest[] = [];
          companies.forEach((company: any) => {
            if (Array.isArray(company.creditRequests)) {
              company.creditRequests.forEach((cr: any) => {
                creditRequests.push({
                  ...cr,
                  tenantCompanyId: company._id || company.id,
                  tenantCompanyName: company.companyName || company.name || '',
                  tenantCompanyCode: company.companyCode || company.code || '',
                });
              });
            }
          });
          setExtraCreditRequests(creditRequests);
        }

        if (billingRes.status === 'rejected') setErrorMessage((prev) => prev || 'Failed to load tenant billing.');
        if (bookingRes.status === 'rejected') setErrorMessage((prev) => prev || 'Failed to load bookings.');
        if (payrollRes.status === 'rejected') setErrorMessage((prev) => prev || 'Failed to load payroll.');
        if (creditRes.status === 'rejected') setErrorMessage((prev) => prev || 'Failed to load credit requests.');
      } catch (error: any) {
        if (!alive) return;
        setErrorMessage(error?.message || 'Failed to load billing & payments data.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void loadAll();

    const refresh = () => { void loadAll(); };
    window.addEventListener('finance:snapshot-updated', refresh);
    return () => {
      alive = false;
      window.removeEventListener('finance:snapshot-updated', refresh);
    };
  }, [selectedFY]);

  /* ── Derived data ── */

  const visibleTenantBills = useMemo(() => {
    return tenantBills.filter((bill) => {
      if (statusFilter !== 'All' && bill.securityDepositPaidStatus !== statusFilter && bill.invoiceStatus !== statusFilter) return false;
      if (!searchQuery) return true;
      const haystack = [bill.company, bill.packageName, bill.package, bill.invoiceNumber, bill.status].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [tenantBills, statusFilter, searchQuery]);

  const visibleBookings = useMemo(() => {
    return bookingRecords.filter((booking) => {
      if (statusFilter !== 'All' && booking.paymentStatus !== statusFilter && booking.invoiceStatus !== statusFilter) return false;
      if (!searchQuery) return true;
      const haystack = [booking.bookedByName, booking.clientCompany, booking.roomName, booking.resourceName, booking.bookingCode, booking.invoiceNumber].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [bookingRecords, statusFilter, searchQuery]);

  const payablePayrollEmployees = useMemo(() => {
    return payrollData?.currentCycle?.employees || [];
  }, [payrollData]);

  const filteredPayrollEmployees = useMemo(() => {
    return payablePayrollEmployees.filter((emp) => {
      if (statusFilter !== 'All') {
        const payStatus = emp.payment?.status || emp.financials?.paymentStatus || '';
        if (payStatus !== statusFilter) return false;
      }
      if (!searchQuery) return true;
      const haystack = [emp.name, emp.employeeId, emp.department].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [payablePayrollEmployees, statusFilter, searchQuery]);

  const visibleExtraCredits = useMemo(() => {
    return extraCreditRequests.filter((cr) => {
      if (statusFilter !== 'All' && cr.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const haystack = [cr.tenantCompanyName, cr.tenantCompanyCode, cr.invoiceNumber].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [extraCreditRequests, statusFilter, searchQuery]);

  const statCards = useMemo(() => {
    switch (activeTab) {
      case 'tenant': {
        const total = tenantBills.length;
        const pendingDeposits = tenantBills.filter((b) => b.securityDepositPaidStatus !== 'Paid').length;
        const paid = tenantBills.filter((b) => b.securityDepositPaidStatus === 'Paid').length;
        const invoiced = tenantBills.filter((b) => b.invoiceNumber).length;
        return [
          { key: 'total', label: 'Total Deposits', value: String(total), icon: Building2 },
          { key: 'pending', label: 'Pending', value: String(pendingDeposits), icon: Clock },
          { key: 'paid', label: 'Paid', value: String(paid), icon: CheckCircle2 },
          { key: 'invoiced', label: 'Invoiced', value: String(invoiced), icon: FileText },
        ];
      }
      case 'bookings': {
        const total = bookingRecords.length;
        const pending = bookingRecords.filter((b) => b.paymentStatus !== 'Paid' && b.paymentStatus !== 'Completed').length;
        const invoiced = bookingRecords.filter((b) => b.invoiceNumber).length;
        const completed = bookingRecords.filter((b) => b.paymentStatus === 'Paid' || b.paymentStatus === 'Completed').length;
        return [
          { key: 'total', label: 'Total Bookings', value: String(total), icon: Calendar },
          { key: 'pending', label: 'Pending Payment', value: String(pending), icon: Clock },
          { key: 'invoiced', label: 'Invoiced', value: String(invoiced), icon: FileText },
          { key: 'completed', label: 'Completed', value: String(completed), icon: CheckCircle2 },
        ];
      }
      case 'payroll': {
        const total = payablePayrollEmployees.length;
        const netPayable = payablePayrollEmployees.reduce((s, e) => s + (e.financials?.netSalary || 0), 0);
        const paid = payablePayrollEmployees.filter((e) => (e.payment?.status || e.financials?.paymentStatus) === 'Paid').length;
        const pendingPay = payablePayrollEmployees.filter((e) => (e.payment?.status || e.financials?.paymentStatus || 'Pending') !== 'Paid').length;
        return [
          { key: 'total', label: 'Total Employees', value: String(total), icon: Users },
          { key: 'netPayable', label: 'Net Payable', value: formatCurrency(netPayable), isCurrency: true, icon: IndianRupee },
          { key: 'paid', label: 'Paid', value: String(paid), icon: CheckCircle2 },
          { key: 'pending', label: 'Pending', value: String(pendingPay), icon: Clock },
        ];
      }
      case 'extraCredits': {
        const total = extraCreditRequests.length;
        const pendingExtra = extraCreditRequests.filter((cr) => cr.status !== 'COMPLETED' && cr.status !== 'REJECTED').length;
        const completed = extraCreditRequests.filter((cr) => cr.status === 'COMPLETED').length;
        const rejected = extraCreditRequests.filter((cr) => cr.status === 'REJECTED').length;
        return [
          { key: 'total', label: 'Total Requests', value: String(total), icon: CreditCard },
          { key: 'pending', label: 'Pending', value: String(pendingExtra), icon: Clock },
          { key: 'completed', label: 'Completed', value: String(completed), icon: CheckCircle2 },
          { key: 'rejected', label: 'Rejected', value: String(rejected), icon: XCircle },
        ];
      }
      case 'history': {
        const total = transactionHistory.length;
        const totalAmount = transactionHistory.reduce((s, t) => s + t.amount, 0);
        return [
          { key: 'total', label: 'All Transactions', value: String(total), icon: Clock },
          { key: 'totalAmount', label: 'Total Volume', value: formatCurrency(totalAmount), isCurrency: true, icon: IndianRupee },
          { key: 'empty', label: '', value: '', icon: PieChart },
          { key: 'empty2', label: '', value: '', icon: PieChart },
        ];
      }
      default:
        return [];
    }
  }, [activeTab, tenantBills, bookingRecords, payablePayrollEmployees, extraCreditRequests, transactionHistory]);

  const activeReportLabel = (() => {
    switch (activeTab) {
      case 'tenant': return 'Tenant Security Deposits';
      case 'bookings': return 'Meeting Room Bookings';
      case 'payroll': return 'Payroll';
      case 'extraCredits': return 'Extra Credit Requests';
      case 'history': return 'Transaction History';
      default: return 'Billing & Payments';
    }
  })();

  /* ── Handlers: Tenant Billing ── */

  const handleMarkTenantPaid = async (bill: TenantBillingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await markTenantSecurityDepositPaid(bill.recordId || bill.id);
      setTenantBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, securityDepositPaidStatus: 'Paid' } : b)));
      if (viewingTenantBill?.id === bill.id) setViewingTenantBill((prev) => prev ? { ...prev, securityDepositPaidStatus: 'Paid' } : null);
      toast.success(`Security deposit marked as paid for ${bill.company}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to mark as paid.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGenerateTenantInvoice = async (bill: TenantBillingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await generateTenantSecurityDepositInvoice(bill.recordId || bill.id);
      const updated = res?.data?.data || res?.data || {};
      setTenantBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, invoiceNumber: updated.invoiceNumber || b.invoiceNumber, invoiceFileUrl: updated.invoiceFileUrl || b.invoiceFileUrl, invoiceStatus: 'Generated', invoiceGeneratedAt: new Date().toISOString() } : b)));
      if (viewingTenantBill?.id === bill.id) setViewingTenantBill((prev) => prev ? { ...prev, invoiceNumber: updated.invoiceNumber || prev.invoiceNumber, invoiceFileUrl: updated.invoiceFileUrl || prev.invoiceFileUrl, invoiceStatus: 'Generated' } : null);
      toast.success(`Invoice generated for ${bill.company}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendTenantInvoice = async (bill: TenantBillingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await sendTenantSecurityDepositInvoice(bill.recordId || bill.id);
      setTenantBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, invoiceStatus: 'Sent', invoiceSentAt: new Date().toISOString() } : b)));
      if (viewingTenantBill?.id === bill.id) setViewingTenantBill((prev) => prev ? { ...prev, invoiceStatus: 'Sent' } : null);
      toast.success(`Invoice sent for ${bill.company}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResetTenantInvoice = async (bill: TenantBillingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await resetTenantSecurityDepositInvoice(bill.recordId || bill.id);
      setTenantBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, invoiceNumber: '', invoiceFileUrl: '', invoiceStatus: 'Pending', invoiceGeneratedAt: '', invoiceSentAt: '' } : b)));
      if (viewingTenantBill?.id === bill.id) setViewingTenantBill((prev) => prev ? { ...prev, invoiceNumber: '', invoiceFileUrl: '', invoiceStatus: 'Pending' } : null);
      toast.success(`Invoice reset for ${bill.company}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  /* ── Handlers: Bookings ── */

  const handleGenerateBookingInvoice = async (booking: BookingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await generateMeetingRoomInvoice(booking.recordId || booking.id);
      const updated = res?.data?.data || res?.data || {};
      setBookingRecords((prev) => prev.map((b) => (b.id === booking.id ? { ...b, invoiceNumber: updated.invoiceNumber || b.invoiceNumber, invoiceFileUrl: updated.invoiceFileUrl || b.invoiceFileUrl, invoiceStatus: 'Generated' } : b)));
      if (viewingBooking?.id === booking.id) setViewingBooking((prev) => prev ? { ...prev, invoiceNumber: updated.invoiceNumber || prev.invoiceNumber, invoiceFileUrl: updated.invoiceFileUrl || prev.invoiceFileUrl, invoiceStatus: 'Generated' } : null);
      toast.success(`Invoice generated for booking ${booking.bookingCode || booking.id}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendBookingInvoice = async (booking: BookingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await sendMeetingRoomInvoice(booking.recordId || booking.id);
      setBookingRecords((prev) => prev.map((b) => (b.id === booking.id ? { ...b, invoiceStatus: 'Sent', invoiceSentAt: new Date().toISOString() } : b)));
      if (viewingBooking?.id === booking.id) setViewingBooking((prev) => prev ? { ...prev, invoiceStatus: 'Sent' } : null);
      toast.success(`Invoice sent for booking ${booking.bookingCode || booking.id}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResetBookingInvoice = async (booking: BookingRecord) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await resetMeetingRoomInvoice(booking.recordId || booking.id);
      setBookingRecords((prev) => prev.map((b) => (b.id === booking.id ? { ...b, invoiceNumber: '', invoiceFileUrl: '', invoiceStatus: 'Pending' } : b)));
      if (viewingBooking?.id === booking.id) setViewingBooking((prev) => prev ? { ...prev, invoiceNumber: '', invoiceFileUrl: '', invoiceStatus: 'Pending' } : null);
      toast.success(`Invoice reset for booking ${booking.bookingCode || booking.id}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  /* ── Handlers: Payroll ── */

  const handleMarkPayrollPaid = async (employee: PayrollEmployee) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await processPayrollPayment(employee.cycleId || payrollData?.currentCycle?.id || '', employee.id);
      setPayrollData((prev) => {
        if (!prev?.currentCycle?.employees) return prev;
        return {
          ...prev,
          currentCycle: {
            ...prev.currentCycle,
            employees: prev.currentCycle.employees.map((e) => e.id === employee.id ? { ...e, payment: { ...e.payment, status: 'Paid' }, financials: { ...e.financials, paymentStatus: 'Paid' } } : e),
          },
        };
      });
      if (viewingEmployee?.id === employee.id) setViewingEmployee((prev) => prev ? { ...prev, payment: { ...prev.payment, status: 'Paid' }, financials: { ...prev.financials, paymentStatus: 'Paid' } } : null);
      toast.success(`Payroll processed for ${employee.name}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process payroll payment.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGeneratePayslip = async (employee: PayrollEmployee) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await generatePayrollPayslip(employee.cycleId || payrollData?.currentCycle?.id || '', employee.id);
      const updated = res?.data?.data || res?.data || {};
      setPayrollData((prev) => {
        if (!prev?.currentCycle?.employees) return prev;
        return {
          ...prev,
          currentCycle: {
            ...prev.currentCycle,
            employees: prev.currentCycle.employees.map((e) => e.id === employee.id ? { ...e, payslip: { id: updated.payslipId || updated.id || e.payslip?.id, fileUrl: updated.fileUrl || updated.payslipUrl || e.payslip?.fileUrl, url: updated.url || e.payslip?.url } } : e),
          },
        };
      });
      toast.success(`Payslip generated for ${employee.name}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate payslip.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendPayrollPayslip = async (employee: PayrollEmployee) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await sendPayrollPayslip(employee.cycleId || payrollData?.currentCycle?.id || '', employee.id);
      toast.success(`Payslip sent to ${employee.name}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send payslip.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  /* ── Handlers: Extra Credit ── */

  const handleCreditFinanceAction = async (credit: ExtraCreditRequest, action: string) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await updateTenantCompanyCreditRequest(credit.tenantCompanyId || '', credit._id || credit.id || '', { status: action });
      setExtraCreditRequests((prev) => prev.map((cr) => ((cr._id || cr.id) === (credit._id || credit.id) ? { ...cr, status: action } : cr)));
      if (viewingExtraCredit?._id === credit._id || viewingExtraCredit?.id === credit.id) setViewingExtraCredit((prev) => prev ? { ...prev, status: action } : null);
      toast.success(`Credit request ${action === 'COMPLETED' ? 'completed' : action === 'REJECTED' ? 'rejected' : 'updated'}.`);
      window.dispatchEvent(new Event('finance:snapshot-updated'));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update credit request.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  /* ── Export handler ── */

  const handleExportActiveReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    const fiscalYearLabel = selectedFY || DEFAULT_FISCAL_YEAR;
    const reportMonth = new Date().toISOString().slice(0, 7);

    const reportConfigByTab: Record<string, any> = {
      tenant: {
        title: `Billing - Tenant Security Deposits - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Tenant Deposits`,
        description: `Tenant security deposit report for ${fiscalYearLabel}.`,
        sourceRef: 'finance-tenant-deposits',
        reportRows: buildTenantBillingReportRows(visibleTenantBills, { fiscalYear: selectedFY, statusFilter, searchQuery }),
        hasData: visibleTenantBills.length > 0,
      },
      bookings: {
        title: `Billing - Meeting Room Bookings - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Bookings`,
        description: `Meeting room booking invoice report for ${fiscalYearLabel}.`,
        sourceRef: 'finance-booking-invoices',
        reportRows: buildBookingReportRows(visibleBookings, { fiscalYear: selectedFY, statusFilter, searchQuery }),
        hasData: visibleBookings.length > 0,
      },
      payroll: {
        title: `Billing - Payroll - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Payroll`,
        description: `Payroll report for ${fiscalYearLabel}.`,
        sourceRef: 'finance-payroll',
        reportRows: buildPayrollReportRows(filteredPayrollEmployees, payrollData?.currentCycle || null, payrollData?.history || [], { fiscalYear: selectedFY, statusFilter, searchQuery }),
        hasData: filteredPayrollEmployees.length > 0,
      },
      extraCredits: {
        title: `Billing - Extra Credit Requests - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Extra Credits`,
        description: `Extra credit request report for ${fiscalYearLabel}.`,
        sourceRef: 'finance-extra-credits',
        reportRows: buildExtraCreditReportRows(visibleExtraCredits, { fiscalYear: selectedFY, statusFilter, searchQuery }),
        hasData: visibleExtraCredits.length > 0,
      },
      history: {
        title: `Billing - Transaction History - ${fiscalYearLabel}`,
        period: `${fiscalYearLabel} Transactions`,
        description: `Transaction history report for ${fiscalYearLabel}.`,
        sourceRef: 'finance-transaction-history',
        reportRows: buildHistoryReportRows(transactionHistory, { fiscalYear: selectedFY, searchQuery }),
        hasData: transactionHistory.length > 0,
      },
    };

    const selectedReport = reportConfigByTab[activeTab];
    if (!selectedReport?.hasData) {
      toast.error(`No ${activeReportLabel.toLowerCase()} data to export for ${fiscalYearLabel}.`);
      return;
    }

    try {
      const response = await createReport({
        title: selectedReport.title,
        department: 'Finance',
        category: 'Financial',
        dataWindow: 'Annual',
        reportMonth,
        period: selectedReport.period,
        generatedBy: currentUserName,
        format: reportFormat,
        description: selectedReport.description,
        sourceType: 'custom',
        sourceRef: selectedReport.sourceRef,
        reportRows: selectedReport.reportRows,
      });
      if (reportFormat === 'PDF') await downloadReportFile(response?.data?.download, { openInNewTab: false });
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(`${activeReportLabel} report saved.`);
    } catch (exportError: any) {
      toast.error(exportError?.message || 'Failed to export report.');
    }
  };

  if (isLoading) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Billing & Payments
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Core Module | Invoicing, payroll & payment management</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
                <Calendar size={18} className="text-[#2563EB]" />
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent font-black text-[#0F172A] outline-none cursor-pointer border-none text-xs"
                >
                  {fiscalYearOptions.map((year: string) => (
                    <option key={year} value={year}>{year}{year === DEFAULT_FISCAL_YEAR ? ' (Default)' : ''}</option>
                  ))}
                </select>
              </div>
              <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Pill Tabs (DESIGN.md: pill-style with blue active bg) ── */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Stat Cards (DESIGN.md: border-l-4 accent per card, tab-aware) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {statCards.map((card, idx) => {
              if (!card.label) return <div key={card.key} />;
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-amber-50 text-amber-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className={`text-[15px] font-black ${card.isCurrency ? 'text-blue-600' : 'text-slate-900'}`}>{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <select
                  className="w-full sm:w-44 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Paid</option>
                  <option>Pending</option>
                  <option>Generated</option>
                  <option>Sent</option>
                  <option>Failed</option>
                  <option>Rejected</option>
                </select>
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[700px]">

                {activeTab === 'tenant' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Company</th>
                        <th className="px-6 py-5">Package</th>
                        <th className="px-6 py-5">Deposit</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Invoice</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleTenantBills.length > 0 ? visibleTenantBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5"><Building2 size={13} className="text-slate-400" /> {bill.company}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-700 text-xs">{bill.packageName || bill.package || '-'}</p>
                            <p className="text-[9px] font-semibold text-slate-400">{bill.seats} seats | {bill.contractDurationMonths}m</p>
                          </td>
                          <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(bill.securityDepositAmount || 0)}</td>
                          <td className="px-6 py-5 hidden sm:table-cell">
                            {bill.invoiceNumber ? (
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-blue-600">{bill.invoiceNumber}</p>
                                <p className="text-[9px] font-semibold text-slate-400">{bill.invoiceStatus}</p>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Not Generated</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center">{getStatusBadge(bill.securityDepositPaidStatus || bill.invoiceStatus)}</td>
                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => setViewingTenantBill(bill)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <Eye size={10} /> View
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No tenant billing records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'bookings' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Booked By</th>
                        <th className="px-6 py-5">Room</th>
                        <th className="px-6 py-5">Date / Time</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Amount</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleBookings.length > 0 ? visibleBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm">{booking.bookedByName || 'Guest'}</p>
                            {booking.clientCompany && <p className="text-[9px] font-semibold text-slate-400">{booking.clientCompany}</p>}
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700 text-xs">{booking.roomName || booking.resourceName || '-'}</td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-bold text-slate-700">{booking.date || booking.dateLabel || '-'}</p>
                            <p className="text-[9px] font-semibold text-slate-400">{booking.startTime || booking.timeSlot || ''}{booking.startTime && booking.endTime ? ` - ${booking.endTime}` : ''}</p>
                          </td>
                          <td className="px-6 py-5 hidden sm:table-cell font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(booking.totalAmount || booking.amount || 0)}</td>
                          <td className="px-6 py-5 text-center">{getStatusBadge(booking.paymentStatus || booking.invoiceStatus)}</td>
                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => setViewingBooking(booking)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <Eye size={10} /> View
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No booking records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'payroll' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Employee</th>
                        <th className="px-6 py-5">Department</th>
                        <th className="px-6 py-5">Net Salary</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Bank Details</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {filteredPayrollEmployees.length > 0 ? filteredPayrollEmployees.map((emp) => {
                        const payStatus = emp.payment?.status || emp.financials?.paymentStatus || 'Pending';
                        return (
                          <tr key={emp.id} className="hover:bg-blue-50/30 transition-all">
                            <td className="px-6 py-5">
                              <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5"><User size={13} className="text-slate-400" /> {emp.name || 'Unknown'}</p>
                              {emp.employeeId && <p className="text-[9px] font-semibold text-slate-400">ID: {emp.employeeId}</p>}
                            </td>
                            <td className="px-6 py-5 font-bold text-slate-700 text-xs">{emp.department || '-'}</td>
                            <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(emp.financials?.netSalary || 0)}</td>
                            <td className="px-6 py-5 hidden sm:table-cell">
                              {emp.bankDetails?.bankName ? (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-700">{emp.bankDetails.bankName}</p>
                                  <p className="text-[9px] font-semibold text-slate-400">{emp.bankDetails.accountHolderName} | {emp.bankDetails.accountNumber}</p>
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Not Available</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">{getStatusBadge(payStatus)}</td>
                            <td className="px-6 py-5 text-center">
                              <button
                                onClick={() => setViewingEmployee(emp)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto"
                              >
                                <Eye size={10} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No payroll records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'extraCredits' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Tenant</th>
                        <th className="px-6 py-5">Credits</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Invoice</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {visibleExtraCredits.length > 0 ? visibleExtraCredits.map((cr) => (
                        <tr key={cr._id || cr.id} className="hover:bg-blue-50/30 transition-all">
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 text-xs sm:text-sm">{cr.tenantCompanyName || cr.tenantCompanyCode || '-'}</p>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700 text-xs">{cr.requestedCredits || 0}</td>
                          <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(cr.totalAmount || 0)}</td>
                          <td className="px-6 py-5 hidden sm:table-cell">
                            {cr.invoiceNumber ? (
                              <p className="text-[10px] font-bold text-blue-600">{cr.invoiceNumber}</p>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center">{getStatusBadge(getCreditRequestStatusLabel(cr.status))}</td>
                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => setViewingExtraCredit(cr)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <Eye size={10} /> View
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No extra credit requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

                {activeTab === 'history' && (
                  <>
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Entity</th>
                        <th className="px-6 py-5">Type</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5 hidden sm:table-cell">Reference</th>
                        <th className="px-6 py-5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {transactionHistory.length > 0 ? transactionHistory.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-5 font-bold text-slate-700 text-xs">{tx.date || '-'}</td>
                          <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{tx.entity}</td>
                          <td className="px-6 py-5"><span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[9px] font-black uppercase tracking-wider">{tx.type}</span></td>
                          <td className="px-6 py-5 font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(tx.amount)}</td>
                          <td className="px-6 py-5 hidden sm:table-cell text-[10px] font-bold text-slate-500">{tx.ref || '-'}</td>
                          <td className="px-6 py-5 text-[10px] font-medium text-slate-600 max-w-[200px] truncate">{tx.details || '-'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No transaction history found.</td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}

              </table>
            </div>
          </div>
        </div>
      </PageFrame>

      {/* ── View Tenant Bill Modal ── */}
      {viewingTenantBill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border-blue-400/30 mb-2 inline-block">Tenant Security Deposit</span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1"><Building2 size={20} /> {viewingTenantBill.company}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">ID: {viewingTenantBill.recordId || viewingTenantBill.id}</p>
              </div>
              <button onClick={() => setViewingTenantBill(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Security Deposit</p>
                  <p className="text-xl font-black text-blue-900 mt-1">{formatCurrency(viewingTenantBill.securityDepositAmount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Monthly Rent</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(viewingTenantBill.monthlyRent || 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Contract</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{viewingTenantBill.contractDurationMonths || 0} months</p>
                  <p className="text-[10px] font-semibold text-gray-400">{viewingTenantBill.seats} seats</p>
                </div>
              </div>
              <div className="px-6 sm:px-8 py-5 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Package</p>
                    <p className="font-black text-gray-900">{viewingTenantBill.packageName || viewingTenantBill.package || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Cycle</p>
                    <p className="font-black text-gray-900">{viewingTenantBill.cycle || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Due Date</p>
                    <p className="font-bold text-gray-700">{viewingTenantBill.dueDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Contract</p>
                    <p className="font-black text-gray-900">{formatCurrency(viewingTenantBill.totalContractAmount || 0)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Invoice Status</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold">Status:</span>
                    {getStatusBadge(viewingTenantBill.invoiceStatus || 'Pending')}
                    {viewingTenantBill.invoiceNumber && <span className="text-xs font-bold text-blue-600 ml-2">{viewingTenantBill.invoiceNumber}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold">Payment:</span>
                    {getStatusBadge(viewingTenantBill.securityDepositPaidStatus || 'Pending')}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 shrink-0">
              {viewingTenantBill.securityDepositPaidStatus !== 'Paid' && (
                <button
                  type="button"
                  onClick={() => handleMarkTenantPaid(viewingTenantBill)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={12} /> {isProcessingAction ? 'Processing...' : 'Mark Paid'}
                </button>
              )}
              {!viewingTenantBill.invoiceNumber && viewingTenantBill.securityDepositPaidStatus === 'Paid' && (
                <button
                  type="button"
                  onClick={() => handleGenerateTenantInvoice(viewingTenantBill)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <FileText size={12} /> {isProcessingAction ? 'Processing...' : 'Generate Invoice'}
                </button>
              )}
              {viewingTenantBill.invoiceNumber && viewingTenantBill.invoiceStatus !== 'Sent' && (
                <button
                  type="button"
                  onClick={() => handleSendTenantInvoice(viewingTenantBill)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Send size={12} /> {isProcessingAction ? 'Processing...' : 'Send Invoice'}
                </button>
              )}
              {viewingTenantBill.invoiceFileUrl && (
                <button
                  type="button"
                  onClick={() => window.open(viewingTenantBill.invoiceFileUrl, '_blank', 'noopener,noreferrer')}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <FileText size={12} /> View Invoice
                </button>
              )}
              {viewingTenantBill.invoiceNumber && (
                <button
                  type="button"
                  onClick={() => handleResetTenantInvoice(viewingTenantBill)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-red-50 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <XCircle size={12} /> Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Booking Modal ── */}
      {viewingBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border-amber-400/30 mb-2 inline-block">Meeting Room Booking</span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1"><Calendar size={20} /> {viewingBooking.bookedByName || 'Guest Booking'}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">Code: {viewingBooking.bookingCode || viewingBooking.recordId || viewingBooking.id}</p>
              </div>
              <button onClick={() => setViewingBooking(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Total Amount</p>
                  <p className="text-xl font-black text-amber-900 mt-1">{formatCurrency(viewingBooking.totalAmount || viewingBooking.amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Room</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{viewingBooking.roomName || viewingBooking.resourceName || '-'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Payment Mode</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{viewingBooking.paymentMode || '-'}</p>
                </div>
              </div>
              <div className="px-6 sm:px-8 py-5 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Date</p>
                    <p className="font-black text-gray-900">{viewingBooking.date || viewingBooking.dateLabel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Time</p>
                    <p className="font-black text-gray-900">{viewingBooking.startTime || viewingBooking.timeSlot || '-'}{viewingBooking.endTime ? ` - ${viewingBooking.endTime}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Transaction ID</p>
                    <p className="font-bold text-gray-700">{viewingBooking.transactionId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Booking Source</p>
                    <p className="font-bold text-gray-700">{viewingBooking.bookingSource || '-'}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Invoice & Payment</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-xs font-bold">Invoice: {getStatusBadge(viewingBooking.invoiceStatus || 'Pending')}</span>
                    <span className="text-xs font-bold">Payment: {getStatusBadge(viewingBooking.paymentStatus || 'Pending')}</span>
                  </div>
                  {viewingBooking.invoiceNumber && <p className="text-xs font-bold text-blue-600 mt-1">{viewingBooking.invoiceNumber}</p>}
                </div>
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 shrink-0">
              {!viewingBooking.invoiceNumber && (
                <button
                  type="button"
                  onClick={() => handleGenerateBookingInvoice(viewingBooking)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <FileText size={12} /> {isProcessingAction ? 'Processing...' : 'Generate Invoice'}
                </button>
              )}
              {viewingBooking.invoiceNumber && viewingBooking.invoiceStatus !== 'Sent' && (
                <button
                  type="button"
                  onClick={() => handleSendBookingInvoice(viewingBooking)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Send size={12} /> {isProcessingAction ? 'Processing...' : 'Send Invoice'}
                </button>
              )}
              {viewingBooking.invoiceFileUrl && (
                <button
                  type="button"
                  onClick={() => window.open(viewingBooking.invoiceFileUrl, '_blank', 'noopener,noreferrer')}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <FileText size={12} /> View Invoice
                </button>
              )}
              {viewingBooking.invoiceNumber && (
                <button
                  type="button"
                  onClick={() => handleResetBookingInvoice(viewingBooking)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-red-50 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <XCircle size={12} /> Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Employee Payroll Modal ── */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-green-500/20 text-green-300 border-green-400/30 mb-2 inline-block">Payroll</span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1"><User size={20} /> {viewingEmployee.name || 'Employee'}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{viewingEmployee.department} | {viewingEmployee.employeeId || viewingEmployee.profileId || ''}</p>
              </div>
              <button onClick={() => setViewingEmployee(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Net Salary</p>
                  <p className="text-xl font-black text-green-900 mt-1">{formatCurrency(viewingEmployee.financials?.netSalary || 0)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Status</p>
                  <div className="mt-1">{getStatusBadge(viewingEmployee.payment?.status || viewingEmployee.financials?.paymentStatus || 'Pending')}</div>
                </div>
              </div>
              <div className="px-6 sm:px-8 py-5 space-y-4 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Bank</p><p className="font-black text-gray-900">{viewingEmployee.bankDetails?.bankName || viewingEmployee.bankName || '-'}</p></div>
                  <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Account Holder</p><p className="font-black text-gray-900">{viewingEmployee.bankDetails?.accountHolderName || viewingEmployee.accountHolderName || '-'}</p></div>
                  <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Account Number</p><p className="font-black text-gray-900">{viewingEmployee.bankDetails?.accountNumber || viewingEmployee.accountNumberMasked || viewingEmployee.accountNumber || '-'}</p></div>
                  <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">IFSC</p><p className="font-black text-gray-900">{viewingEmployee.bankDetails?.ifscCode || viewingEmployee.ifscCode || '-'}</p></div>
                </div>
                {viewingEmployee.payslip?.id && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Payslip</p>
                    <p className="text-xs font-bold text-blue-600">ID: {viewingEmployee.payslip.id}</p>
                    {(viewingEmployee.payslip.fileUrl || viewingEmployee.payslip.payslipUrl || viewingEmployee.payslip.url) && (
                      <button
                        type="button"
                        onClick={() => window.open(viewingEmployee.payslip.fileUrl || viewingEmployee.payslip.payslipUrl || viewingEmployee.payslip.url, '_blank', 'noopener,noreferrer')}
                        className="mt-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
                      >
                        <FileText size={12} /> View Payslip
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 shrink-0">
              {(viewingEmployee.payment?.status || viewingEmployee.financials?.paymentStatus || 'Pending') !== 'Paid' && (
                <button
                  type="button"
                  onClick={() => handleMarkPayrollPaid(viewingEmployee)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={12} /> {isProcessingAction ? 'Processing...' : 'Mark Paid'}
                </button>
              )}
              {!viewingEmployee.payslip?.id && (
                <button
                  type="button"
                  onClick={() => handleGeneratePayslip(viewingEmployee)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <FileText size={12} /> {isProcessingAction ? 'Processing...' : 'Generate Payslip'}
                </button>
              )}
              {viewingEmployee.payslip?.id && (
                <button
                  type="button"
                  onClick={() => handleSendPayrollPayslip(viewingEmployee)}
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Send size={12} /> {isProcessingAction ? 'Processing...' : 'Send Payslip'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Extra Credit Modal ── */}
      {viewingExtraCredit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 sm:px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border-purple-400/30 mb-2 inline-block">Extra Credit Request</span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1"><CreditCard size={20} /> {viewingExtraCredit.tenantCompanyName || viewingExtraCredit.tenantCompanyCode || 'Extra Credit'}</h2>
              </div>
              <button onClick={() => setViewingExtraCredit(null)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
              <div className="px-6 sm:px-8 py-5 grid grid-cols-2 gap-4 border-b border-gray-100 bg-white">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-purple-600">Credits Requested</p>
                  <p className="text-xl font-black text-purple-900 mt-1">{viewingExtraCredit.requestedCredits || 0}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Total Amount</p>
                  <p className="text-xl font-black text-amber-900 mt-1">{formatCurrency(viewingExtraCredit.totalAmount || 0)}</p>
                </div>
              </div>
              <div className="px-6 sm:px-8 py-5 space-y-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Tenant Code</p>
                    <p className="font-black text-gray-900">{viewingExtraCredit.tenantCompanyCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                    <div>{getStatusBadge(getCreditRequestStatusLabel(viewingExtraCredit.status))}</div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Transaction ID</p>
                    <p className="font-bold text-gray-700">{viewingExtraCredit.paymentTransactionId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Invoice</p>
                    <p className="font-bold text-blue-600">{viewingExtraCredit.invoiceNumber || 'Pending'}</p>
                  </div>
                </div>
                {viewingExtraCredit.paymentFailureReason && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1">Failure Reason</p>
                    <p className="text-xs font-bold text-red-700">{viewingExtraCredit.paymentFailureReason}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 shrink-0">
              {viewingExtraCredit.status !== 'COMPLETED' && viewingExtraCredit.status !== 'REJECTED' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCreditFinanceAction(viewingExtraCredit, 'COMPLETED')}
                    disabled={isProcessingAction}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> {isProcessingAction ? 'Processing...' : 'Mark Completed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreditFinanceAction(viewingExtraCredit, 'REJECTED')}
                    disabled={isProcessingAction}
                    className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-red-50 transition-all disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </>
              )}
              {viewingExtraCredit.invoiceFileUrl && (
                <button
                  type="button"
                  onClick={() => window.open(viewingExtraCredit.invoiceFileUrl, '_blank', 'noopener,noreferrer')}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <FileText size={12} /> View Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
