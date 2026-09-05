import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import PageFrame from '@/components/Pages/PageFrame';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { createReport } from '@/services/reports';
import ExportReportModal, { type ExportParams } from '@/components/ExportReportModal';
import ReportExportButton from '@/components/ReportExportButton';
import {
  getAllTenantCompanies,
  getTenantCompanies,
  getTenantCompany,
  getTenantCompanySectors,
  renewTenantCompany,
  uploadTenantCompanyAgreementDocuments,
  updateTenantCompany,
} from '@/services/tenant-companies';
import { getPricingPackages } from '@/services/pricing-packages';
import {
  Search,
  X,
  Eye,
  Edit,
  RefreshCw,
  Building2,
  Users,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { downloadReportFile } from '@/utils/report-download';

// ── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  role?: string;
  status?: string;
  accountStatus?: string;
  inviteStatus?: string;
  userId?: string;
  inviteId?: string;
  inviteSentAt?: string | null;
  invitedAt?: string | null;
  inviteAcceptedAt?: string | null;
  registeredAt?: string | null;
  lastLoginAt?: string | null;
  tenantRole?: string;
  tenantCompanyName?: string;
}

interface CreditHistoryEntry {
  id?: string;
  date?: string;
  type?: string;
  roomName?: string;
  resource?: string;
  bookingCode?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  wing?: string;
  bookedBy?: string;
  status?: string;
  credited?: number;
  used?: number;
  remainingCredits?: number;
}

interface CustomerDetails {
  clientName?: string;
  sector?: string;
  hoCountry?: string;
  hoCity?: string;
  hoState?: string;
}

interface CompanyDetails {
  buildingName?: string;
  unitNo?: string;
  cabinDesks?: number;
  ratePerCabinDesk?: number;
  openDesks?: number;
  ratePerOpenDesk?: number;
  status?: string;
}

interface AgreementDetails {
  annualIncrement?: number;
  perDeskMeetingCredits?: number;
  totalMeetingCredits?: number;
  startDate?: string | null;
  endDate?: string | null;
  lockInPeriod?: number;
}

interface PocDetails {
  localPocName?: string;
  localPocEmail?: string;
  localPocPhone?: string;
  hoPocName?: string;
  hoPocEmail?: string;
  hoPocPhone?: string;
}

interface PackageDetails {
  packageName?: string;
  totalSeats?: number;
  openDesks?: number;
  cabinDesks?: number;
  ratePerOpenDesk?: number;
  ratePerCabinDesk?: number;
  seatTypeVariants?: string[];
  creditsPerSeat?: number;
  monthlyTotalCredits?: number;
  locationMappings?: LocationMapping[];
  creditResetCycle?: string;
  creditUsageTracking?: string;
}

interface LocationMapping {
  floor?: string;
  wing?: string;
  locationCode?: string;
  label?: string;
  seatType?: string;
  seatsAllocated?: number;
}

interface CreditConfiguration {
  monthlyTotalCredits?: number;
  creditResetCycle?: string;
  creditUsageTracking?: string;
}

interface AddOnCredits {
  purchasedCredits?: number;
  remainingCredits?: number;
}

interface BillingDetails {
  contractDurationMonths?: number;
  dailyRent?: number;
  monthlyRent?: number;
  totalContractAmount?: number;
  securityDepositAmount?: number;
  securityDepositPaidStatus?: string;
}

interface InvoiceDetails {
  invoiceNumber?: string;
  invoiceFileName?: string;
  invoiceFileUrl?: string;
  invoiceStatus?: string;
  invoiceGeneratedAt?: string;
  invoiceSentAt?: string;
  invoiceSentToEmail?: string;
}

interface LivePricingSummary {
  openDesks: number;
  cabinDesks: number;
  ratePerOpenDesk: number;
  ratePerCabinDesk: number;
  monthlyRent: number;
  totalContractAmount: number;
  securityDepositAmount: number;
  annualIncrement: number;
}

interface AgreementDocument {
  publicId?: string;
  url?: string;
  name?: string;
  type?: string;
  size?: string;
}

interface SpaceAssigned {
  area?: string;
  openDesks?: number;
  cabinDesks?: number;
  totalSeats?: number;
  assignedSeats?: string[];
  locationLabels?: string[];
  assignedDate?: string | null;
  assignedAt?: string | null;
  zones?: string;
}

interface Space {
  floor?: string;
  seats?: string[];
  assignedDate?: string | null;
}

interface TenantCompany {
  recordId: string;
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  businessType: string;
  pricingPackageId: string;
  packageId: string;
  planType: string;
  packageName: string;
  packageLocationMappings: LocationMapping[];
  packageLocationLabels: string[];
  livePricingSummary: LivePricingSummary;
  contractStart: string;
  contractEnd: string;
  contractStartAt: string | null;
  contractEndAt: string | null;
  contractDurationMonths: number;
  creditsAllocated: number;
  baseCreditsAllocated: number;
  purchasedCredits: number;
  totalCreditsAllocated: number;
  creditsUsed: number;
  status: string;
  notes: string;
  managerEmployeeId: string;
  managerEmployee: Employee | null;
  agreementDocuments: AgreementDocument[];
  billingDetails: BillingDetails;
  invoiceDetails: InvoiceDetails;
  customerDetails: CustomerDetails;
  companyDetails: CompanyDetails;
  agreementDetails: AgreementDetails;
  agreementDetailsAt: {
    startDate: string | null;
    endDate: string | null;
  };
  pocDetails: PocDetails;
  packageDetails: PackageDetails;
  creditConfiguration: CreditConfiguration;
  addOnCredits: AddOnCredits;
  employees: Employee[];
  creditHistory: CreditHistoryEntry[];
  space: Space;
  spaceAssigned: SpaceAssigned;
  initials: string;
}

interface EditFormCustomerDetails {
  clientName: string;
  sector: string;
  hoCountry: string;
  hoState: string;
  hoCity: string;
}

interface EditFormCompanyDetails {
  buildingName: string;
  unitNo: string;
  cabinDesks: string;
  ratePerCabinDesk: string;
  openDesks: string;
  ratePerOpenDesk: string;
  status: string;
}

interface EditFormAgreementDetails {
  annualIncrement: string;
  perDeskMeetingCredits: string;
  totalMeetingCredits: string;
  startDate: string;
  endDate: string;
  lockInPeriod: string;
}

interface EditFormPocDetails {
  localPocName: string;
  localPocEmail: string;
  localPocPhone: string;
  hoPocName: string;
  hoPocEmail: string;
  hoPocPhone: string;
}

interface EditFormPackageDetails {
  packageName: string;
  totalSeats: string;
  openDesks: string;
  cabinDesks: string;
  seatTypeVariants: string;
  creditsPerSeat: string;
  monthlyTotalCredits: string;
  creditResetCycle: string;
  creditUsageTracking: string;
}

interface EditFormAddOnCredits {
  purchasedCredits: string;
  remainingCredits: string;
}

  interface EditFormCreditConfiguration {
    monthlyTotalCredits: string;
    creditResetCycle: string;
    creditUsageTracking: string;
    ratePerCredit: string;
  }

interface EditForm {
  companyName: string;
  businessType: string;
  contactPerson: string;
  email: string;
  phone: string;
  customerDetails: EditFormCustomerDetails;
  companyDetails: EditFormCompanyDetails;
  agreementDetails: EditFormAgreementDetails;
  pocDetails: EditFormPocDetails;
  packageDetails: EditFormPackageDetails;
  addOnCredits: EditFormAddOnCredits;
  creditConfiguration: EditFormCreditConfiguration;
  creditsUsed: string;
  notes: string;
}

// ── Helper Functions ───────────────────────────────────────────────────────

function formatDateLabel(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTimeLabel(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getCreditHistoryStatusBadge(status: string): string {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'cancelled') return 'border-red-200 bg-red-50 text-red-700';
  if (normalized === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'in progress') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'credits added') return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-indigo-200 bg-indigo-50 text-indigo-700';
}

function formatCreditDelta(history: CreditHistoryEntry = {}): string {
  const credited = Number(history.credited || 0);
  const used = Number(history.used || 0);
  const status = String(history.status || '').trim().toLowerCase();
  if (credited > 0 && status === 'cancelled') return `+${credited} refunded`;
  if (credited > 0) return `+${credited} added`;
  return `${used} used`;
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatInteger(value: number = 0): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function formatCurrency(value: number = 0): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function buildTenantCompanyExportRows(company: TenantCompany): Array<{ label: string; value: string }> {
  const employees = normalizeTenantEmployees(company.employees, company.managerEmployeeId);
  const creditHistory = Array.isArray(company.creditHistory) ? company.creditHistory : [];
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Company Name', value: company.name || '-' },
    { label: 'Company Status', value: company.status || '-' },
    { label: 'Business Type', value: company.businessType || '-' },
    { label: 'Contact Person', value: company.contactPerson || '-' },
    { label: 'Plan Type', value: company.planType || '-' },
    { label: 'Contract Start', value: company.contractStart || '-' },
    { label: 'Contract End', value: company.contractEnd || '-' },
    { label: 'Base Credits Allocated', value: String(company.baseCreditsAllocated ?? company.creditConfiguration?.monthlyTotalCredits ?? company.packageDetails?.monthlyTotalCredits ?? company.creditsAllocated ?? 0) },
    { label: 'Purchased Credits', value: String(company.purchasedCredits ?? company.addOnCredits?.purchasedCredits ?? 0) },
    { label: 'Total Usable Credits', value: String(company.totalCreditsAllocated ?? company.creditsAllocated ?? 0) },
    { label: 'Credits Used', value: String(company.creditsUsed ?? 0) },
    { label: 'Credits Remaining', value: String(Math.max(0, Number((company.totalCreditsAllocated ?? company.creditsAllocated) || 0) - Number(company.creditsUsed || 0))) },
    { label: 'Assigned Area', value: company.spaceAssigned?.area || company.space?.floor || 'Unassigned' },
    { label: 'Location Labels', value: Array.isArray(company.spaceAssigned?.locationLabels) && company.spaceAssigned.locationLabels.length > 0 ? company.spaceAssigned.locationLabels.join(', ') : 'N/A' },
    { label: 'Employees', value: String(employees.length) },
    { label: 'Credit History Entries', value: String(creditHistory.length) },
  ];
  employees.slice(0, 25).forEach((employee, index) => {
    rows.push({
      label: `Employee ${index + 1}`,
      value: [
        employee.name || 'Unnamed',
        employee.designation ? `Designation: ${employee.designation}` : '',
        employee.role ? `Role: ${employee.role}` : '',
        employee.status ? `Status: ${employee.status}` : '',
        employee.email ? `Email: ${employee.email}` : '',
        employee.phone ? `Phone: ${employee.phone}` : '',
      ].filter(Boolean).join(' | '),
    });
  });
  return rows;
}

function normalizeText(value: string = ''): string {
  return String(value || '').trim();
}

function buildEmployeeName(employee: Employee = {}): string {
  return normalizeText(employee.name || employee.fullName || employee.email || 'Unnamed employee');
}

function getEmployeeInitials(employee: Employee = {}): string {
  const source = buildEmployeeName(employee);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'E';
}

function normalizeTenantEmployees(employees: Employee[] = [], managerEmployeeId: string = ''): Employee[] {
  const seen = new Set<string>();
  return (Array.isArray(employees) ? employees : [])
    .map((employee) => ({
      ...employee,
      name: normalizeText(employee.name || employee.fullName || ''),
      email: normalizeText(employee.email || '').toLowerCase(),
      designation: normalizeText(employee.designation || ''),
      role: employee.role || (managerEmployeeId && String(managerEmployeeId) === String(employee.id) ? 'Manager' : 'Employee'),
      status: employee.status || 'Active',
      accountStatus: employee.accountStatus || employee.inviteStatus || '',
      inviteStatus: employee.inviteStatus || '',
      userId: employee.userId || '',
      inviteId: employee.inviteId || '',
      inviteSentAt: employee.inviteSentAt || null,
      inviteAcceptedAt: employee.inviteAcceptedAt || null,
      registeredAt: employee.registeredAt || null,
      lastLoginAt: employee.lastLoginAt || null,
      tenantRole: employee.tenantRole || '',
      tenantCompanyName: employee.tenantCompanyName || '',
    }))
    .filter((employee) => employee.name || employee.email)
    .filter((employee) => {
      const key = employee.email
        ? `email:${employee.email}`
        : employee.userId
          ? `user:${String(employee.userId)}`
          : employee.inviteId
            ? `invite:${String(employee.inviteId)}`
            : employee.id
              ? `employee:${String(employee.id)}`
              : `name:${employee.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function addDays(value: string | Date, days: number): Date | null {
  const base = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + days);
  return base;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveTenantDeskRate(companyValue: number = 0, packageValue: number = 0, pricingValue: number = 0): number {
  const companyRate = Math.round(toNumber(companyValue));
  const packageRate = Math.round(toNumber(packageValue));
  const pricingRate = Math.round(toNumber(pricingValue));
  if (packageRate > 0 && pricingRate > 0 && packageRate !== pricingRate && companyRate === pricingRate) return packageRate;
  if (companyRate > 0 && pricingRate > 0 && companyRate !== pricingRate && packageRate === pricingRate) return companyRate;
  if (packageRate > 0 && companyRate > 0 && packageRate !== companyRate) return packageRate;
  return companyRate || packageRate || pricingRate || 0;
}

function toTextList(value: string | string[]): string {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).join('\n');
  return String(value || '');
}

function parseTextList(value: string): string[] {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculatePackageMonthlyCredits(packageDetails: Partial<EditFormPackageDetails> | Record<string, unknown> = {}): number {
  const totalSeats = toNumber(packageDetails.totalSeats);
  const openDesks = toNumber(packageDetails.openDesks);
  const cabinDesks = toNumber(packageDetails.cabinDesks);
  const creditsPerSeat = toNumber(packageDetails.creditsPerSeat);
  const seatTotal = totalSeats > 0 ? totalSeats : openDesks + cabinDesks;
  if (seatTotal > 0 && creditsPerSeat > 0) return seatTotal * creditsPerSeat;
  return toNumber(packageDetails.monthlyTotalCredits);
}

function calculateTotalAllocatedCredits(editForm: EditForm): number {
  return calculatePackageMonthlyCredits(editForm.packageDetails) + toNumber(editForm.addOnCredits?.purchasedCredits);
}

function calculateRemainingCredits(editForm: EditForm): number {
  return Math.max(0, calculateTotalAllocatedCredits(editForm) - toNumber(editForm.creditsUsed));
}

function getInitials(name: string = ''): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function normalizeLocationLabel(value: string = ''): string {
  const normalized = String(value || '').trim().toUpperCase().replace(/[\s_-]+/g, ' ');
  if (!normalized) return '';
  const compact = normalized.replace(/\s+/g, '');
  const match = compact.match(/^(\d{3})([AB])$/);
  return match ? `${match[1]} ${match[2]}` : normalized;
}

function deriveAnnualIncrementAmount(companyDetails: Record<string, unknown> = {}, packageDetails: Record<string, unknown> = {}, durationMonths: number = 1): number {
  const cabinDesks = toNumber(companyDetails.cabinDesks || packageDetails.cabinDesks || 0);
  const openDesks = toNumber(companyDetails.openDesks || packageDetails.openDesks || 0);
  const ratePerCabinDesk = resolveTenantDeskRate(toNumber(companyDetails.ratePerCabinDesk), toNumber(packageDetails.ratePerCabinDesk));
  const ratePerOpenDesk = resolveTenantDeskRate(toNumber(companyDetails.ratePerOpenDesk), toNumber(packageDetails.ratePerOpenDesk));
  const monthlyRent = Math.max(0, (cabinDesks * ratePerCabinDesk) + (openDesks * ratePerOpenDesk)) * 30;
  const contractMonths = Math.max(1, toNumber(durationMonths || 1));
  const totalContractAmount = monthlyRent * contractMonths;
  return Math.round(totalContractAmount * 0.1);
}

function getTenantEmployeeStatusMeta(employee: Employee = {}): { label: string; className: string } {
  const employmentStatus = String(employee.status || '').toLowerCase();
  const accountStatus = String(employee.accountStatus || employee.inviteStatus || '').toLowerCase();
  if (employmentStatus === 'inactive') return { label: 'Inactive', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (accountStatus.includes('logged in')) return { label: 'Logged In', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (accountStatus.includes('registered')) return { label: 'Registered', className: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (accountStatus.includes('invited')) return { label: 'Invited', className: 'bg-violet-100 text-violet-700 border-violet-200' };
  if (accountStatus.includes('failed')) return { label: 'Invite Failed', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: employee.status || 'Pending Invite', className: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function normalizeTenantCompany(company: Record<string, unknown> = {}, packageLookup: Map<string, Record<string, unknown>> = new Map()): TenantCompany {
  const space = (company.space || {}) as Record<string, unknown>;
  const seats = Array.isArray(space.seats) ? space.seats : [];
  const spaceAssigned = (company.spaceAssigned || {}) as Record<string, unknown>;
  const customerDetails = (company.customerDetails || {}) as Record<string, unknown>;
  const companyDetails = (company.companyDetails || {}) as Record<string, unknown>;
  const agreementDetails = (company.agreementDetails || {}) as Record<string, unknown>;
  const pocDetails = (company.pocDetails || {}) as Record<string, unknown>;
  const packageDetails = (company.packageDetails || {}) as Record<string, unknown>;
  const creditConfiguration = (company.creditConfiguration || {}) as Record<string, unknown>;
  const addOnCredits = (company.addOnCredits || {}) as Record<string, unknown>;
  const billingDetails = (company.billingDetails || {}) as Record<string, unknown>;
  const purchasedCredits = Number((addOnCredits as Record<string, unknown>).purchasedCredits || 0);
  const rawPackageId = String(company.pricingPackageId || company.packageId || (company.pricingPackage as Record<string, unknown>)?.recordId || (company.pricingPackage as Record<string, unknown>)?.id || '');
  const matchedPackage = rawPackageId ? (packageLookup.get(String(rawPackageId)) || null) : null;
  const packageSource = matchedPackage || {};
  const derivedMonthlyCredits = Number(
    (packageSource as Record<string, unknown>).monthlyCredits
      || (packageSource as Record<string, unknown>).creditsIncluded
      || (packageDetails as Record<string, unknown>).monthlyTotalCredits
      || (creditConfiguration as Record<string, unknown>).monthlyTotalCredits
      || Math.max(0, Number(company.creditsAllocated || 0) - purchasedCredits),
  );
  const resolvedRatePerOpenDesk = resolveTenantDeskRate(toNumber((companyDetails as Record<string, unknown>).ratePerOpenDesk), toNumber((packageDetails as Record<string, unknown>).ratePerOpenDesk), toNumber((packageSource as Record<string, unknown>).ratePerOpenDesk));
  const resolvedRatePerCabinDesk = resolveTenantDeskRate(toNumber((companyDetails as Record<string, unknown>).ratePerCabinDesk), toNumber((packageDetails as Record<string, unknown>).ratePerCabinDesk), toNumber((packageSource as Record<string, unknown>).ratePerCabinDesk));
  const resolvedOpenDesks = Number((companyDetails as Record<string, unknown>).openDesks || (packageDetails as Record<string, unknown>).openDesks || (packageSource as Record<string, unknown>).openDesks || 0);
  const resolvedCabinDesks = Number((companyDetails as Record<string, unknown>).cabinDesks || (packageDetails as Record<string, unknown>).cabinDesks || (packageSource as Record<string, unknown>).cabinDesks || 0);
  const derivedMonthlyRent = Math.max(0, (resolvedOpenDesks * resolvedRatePerOpenDesk) + (resolvedCabinDesks * resolvedRatePerCabinDesk)) * 30;
  const billingContractDurationMonths = Number(
    (billingDetails as Record<string, unknown>).contractDurationMonths
      || company.contractDurationMonths
      || (packageSource as Record<string, unknown>).durationMonths
      || (agreementDetails as Record<string, unknown>).lockInPeriod
      || 0,
  );
  const derivedAnnualIncrement = deriveAnnualIncrementAmount(
    { openDesks: resolvedOpenDesks, cabinDesks: resolvedCabinDesks, ratePerOpenDesk: resolvedRatePerOpenDesk, ratePerCabinDesk: resolvedRatePerCabinDesk },
    { openDesks: (packageDetails as Record<string, unknown>).openDesks, cabinDesks: (packageDetails as Record<string, unknown>).cabinDesks, ratePerOpenDesk: resolvedRatePerOpenDesk, ratePerCabinDesk: resolvedRatePerCabinDesk },
    billingContractDurationMonths,
  );
  const livePricingSummary: LivePricingSummary = {
    openDesks: resolvedOpenDesks,
    cabinDesks: resolvedCabinDesks,
    ratePerOpenDesk: resolvedRatePerOpenDesk,
    ratePerCabinDesk: resolvedRatePerCabinDesk,
    monthlyRent: derivedMonthlyRent,
    totalContractAmount: derivedMonthlyRent * billingContractDurationMonths,
    securityDepositAmount: Math.round((derivedMonthlyRent * billingContractDurationMonths) * 0.25),
    annualIncrement: derivedAnnualIncrement,
  };
  const contractStartAt = (company.contractStartAt || (agreementDetails as Record<string, unknown>).startDate || null) as string | null;
  const contractEndAt = (company.contractEndAt || (agreementDetails as Record<string, unknown>).endDate || null) as string | null;
  const packageSourceLocationMappings = (packageSource as Record<string, unknown>).locationMappings;
  const packageLocationSource = Array.isArray(packageSourceLocationMappings) && packageSourceLocationMappings.length > 0
    ? packageSourceLocationMappings as LocationMapping[]
    : Array.isArray((packageDetails as Record<string, unknown>).locationMappings)
      ? (packageDetails as Record<string, unknown>).locationMappings as LocationMapping[]
      : [];
  const packageLocationMappings = Array.isArray(packageLocationSource)
    ? packageLocationSource.map((mapping: LocationMapping) => ({
        floor: normalizeText(mapping?.floor as string),
        wing: normalizeText(mapping?.wing as string),
        locationCode: normalizeText(mapping?.locationCode as string).toUpperCase().replace(/[\s_-]+/g, ''),
        label: normalizeLocationLabel(mapping?.label as string || mapping?.locationCode as string),
        seatType: normalizeText(mapping?.seatType as string || 'mixed'),
        seatsAllocated: Number(mapping?.seatsAllocated || 0),
      })).filter((mapping) => Boolean(mapping.label || mapping.locationCode || mapping.floor || mapping.wing))
    : [];
  const packageLocationLabels = Array.from(
    new Set(packageLocationMappings.map((mapping) => normalizeLocationLabel(mapping.label || mapping.locationCode)).filter(Boolean)),
  );
  return {
    recordId: String(company.recordId || company.id || ''),
    id: String(company.id || company.tenantCode || company.recordId || ''),
    name: String(company.companyName || ''),
    contactPerson: String(company.contactName || ''),
    email: String(company.email || ''),
    phone: String(company.phone || ''),
    businessType: String(company.businessType || ''),
    pricingPackageId: rawPackageId || '',
    packageId: rawPackageId || '',
    planType: String((packageSource as Record<string, unknown>).name || (packageDetails as Record<string, unknown>).packageName || company.packageName || company.planType || ''),
    packageName: String((packageSource as Record<string, unknown>).name || (packageDetails as Record<string, unknown>).packageName || company.packageName || company.planType || ''),
    packageLocationMappings,
    packageLocationLabels,
    livePricingSummary,
    contractStart: String(company.contractStart || formatDateLabel(contractStartAt)),
    contractEnd: String(company.contractEnd || formatDateLabel(contractEndAt)),
    contractStartAt,
    contractEndAt,
    contractDurationMonths: Number(company.contractDurationMonths || company.packageDurationMonths || 12),
    creditsAllocated: Number(company.creditsAllocated || company.creditsTotal || 0),
    baseCreditsAllocated: derivedMonthlyCredits,
    purchasedCredits,
    totalCreditsAllocated: Number(company.creditsAllocated || company.creditsTotal || (derivedMonthlyCredits + purchasedCredits) || 0),
    creditsUsed: Number(company.creditsUsed || 0),
    status: String(company.status || 'Active'),
    notes: String(company.notes || ''),
    managerEmployeeId: String(company.managerEmployeeId || (company.managerEmployee as Record<string, unknown>)?.id || ''),
    managerEmployee: (company.managerEmployee as Employee) || null,
    agreementDocuments: Array.isArray(company.agreementDocuments) ? company.agreementDocuments as AgreementDocument[] : [],
    billingDetails: {
      contractDurationMonths: billingContractDurationMonths,
      dailyRent: Number((billingDetails as Record<string, unknown>).dailyRent || (derivedMonthlyRent / 30) || 0),
      monthlyRent: Number((billingDetails as Record<string, unknown>).monthlyRent || derivedMonthlyRent || 0),
      totalContractAmount: Number((billingDetails as Record<string, unknown>).totalContractAmount || livePricingSummary.totalContractAmount || 0),
      securityDepositAmount: Number((billingDetails as Record<string, unknown>).securityDepositAmount || livePricingSummary.securityDepositAmount || 0),
      securityDepositPaidStatus: String((billingDetails as Record<string, unknown>).securityDepositPaidStatus || 'Pending'),
    },
    invoiceDetails: {
      invoiceNumber: String(company.invoiceNumber || ''),
      invoiceFileName: String(company.invoiceFileName || ''),
      invoiceFileUrl: String(company.invoiceFileUrl || ''),
      invoiceStatus: String(company.invoiceStatus || 'Pending'),
      invoiceGeneratedAt: String(company.invoiceGeneratedAt || ''),
      invoiceSentAt: String(company.invoiceSentAt || ''),
      invoiceSentToEmail: String(company.invoiceSentToEmail || ''),
    },
    customerDetails: {
      clientName: String((customerDetails as Record<string, unknown>).clientName || company.companyName || ''),
      sector: String((customerDetails as Record<string, unknown>).sector || company.businessType || ''),
      hoCountry: String((customerDetails as Record<string, unknown>).hoCountry || ''),
      hoState: String((customerDetails as Record<string, unknown>).hoState || ''),
      hoCity: String((customerDetails as Record<string, unknown>).hoCity || ''),
    },
    companyDetails: {
      buildingName: String((companyDetails as Record<string, unknown>).buildingName || ''),
      unitNo: String((companyDetails as Record<string, unknown>).unitNo || ''),
      cabinDesks: resolvedCabinDesks,
      ratePerCabinDesk: resolvedRatePerCabinDesk,
      openDesks: resolvedOpenDesks,
      ratePerOpenDesk: resolvedRatePerOpenDesk,
      status: String(company.status || (companyDetails as Record<string, unknown>).status || 'Active'),
    },
    agreementDetails: {
      annualIncrement: Number((agreementDetails as Record<string, unknown>).annualIncrement || livePricingSummary.annualIncrement),
      perDeskMeetingCredits: Number((agreementDetails as Record<string, unknown>).perDeskMeetingCredits || 0),
      totalMeetingCredits: Number((agreementDetails as Record<string, unknown>).totalMeetingCredits || 0),
      startDate: (agreementDetails as Record<string, unknown>).startDate as string || company.contractStartAt as string || null,
      endDate: (agreementDetails as Record<string, unknown>).endDate as string || company.contractEndAt as string || null,
      lockInPeriod: Number((agreementDetails as Record<string, unknown>).lockInPeriod || company.contractDurationMonths || 12),
    },
    agreementDetailsAt: {
      startDate: (company.contractStartAt as string) || null,
      endDate: (company.contractEndAt as string) || null,
    },
    pocDetails: {
      localPocName: String((pocDetails as Record<string, unknown>).localPocName || company.contactPerson || ''),
      localPocEmail: String((pocDetails as Record<string, unknown>).localPocEmail || company.email || ''),
      localPocPhone: String((pocDetails as Record<string, unknown>).localPocPhone || company.phone || ''),
      hoPocName: String((pocDetails as Record<string, unknown>).hoPocName || ''),
      hoPocEmail: String((pocDetails as Record<string, unknown>).hoPocEmail || ''),
      hoPocPhone: String((pocDetails as Record<string, unknown>).hoPocPhone || ''),
    },
    packageDetails: {
      packageName: String((packageDetails as Record<string, unknown>).packageName || company.planType || ''),
      totalSeats: Number((packageDetails as Record<string, unknown>).totalSeats || company.packageSeatsIncluded || 0),
      openDesks: Number((packageDetails as Record<string, unknown>).openDesks || 0),
      cabinDesks: Number((packageDetails as Record<string, unknown>).cabinDesks || 0),
      ratePerOpenDesk: resolvedRatePerOpenDesk,
      ratePerCabinDesk: resolvedRatePerCabinDesk,
      seatTypeVariants: Array.isArray((packageDetails as Record<string, unknown>).seatTypeVariants) ? (packageDetails as Record<string, unknown>).seatTypeVariants as string[] : [],
      creditsPerSeat: Number((packageDetails as Record<string, unknown>).creditsPerSeat || 0),
      monthlyTotalCredits: derivedMonthlyCredits,
      locationMappings: packageLocationMappings,
      creditResetCycle: String((packageDetails as Record<string, unknown>).creditResetCycle || 'Monthly'),
      creditUsageTracking: String((packageDetails as Record<string, unknown>).creditUsageTracking || ''),
    },
    creditConfiguration: {
      monthlyTotalCredits: derivedMonthlyCredits,
      creditResetCycle: String((creditConfiguration as Record<string, unknown>).creditResetCycle || 'Monthly'),
      creditUsageTracking: String((creditConfiguration as Record<string, unknown>).creditUsageTracking || ''),
      ratePerCredit: String((creditConfiguration as Record<string, unknown>).ratePerCredit ?? 10),
    },
    addOnCredits: {
      purchasedCredits,
      remainingCredits: Number((addOnCredits as Record<string, unknown>).remainingCredits || Math.max(0, Number(company.creditsAllocated || 0) - Number(company.creditsUsed || 0))),
    },
    employees: normalizeTenantEmployees(company.employees as Employee[], String(company.managerEmployeeId || '')),
    creditHistory: Array.isArray(company.creditHistory) ? company.creditHistory as CreditHistoryEntry[] : [],
    space: { floor: String(space.floor || ''), seats, assignedDate: space.assignedDate as string | null },
    spaceAssigned: {
      area: String((spaceAssigned as Record<string, unknown>).area || space.floor || 'Unassigned'),
      openDesks: Number((spaceAssigned as Record<string, unknown>).openDesks || (companyDetails as Record<string, unknown>).openDesks || (packageDetails as Record<string, unknown>).openDesks || 0),
      cabinDesks: Number((spaceAssigned as Record<string, unknown>).cabinDesks || (companyDetails as Record<string, unknown>).cabinDesks || (packageDetails as Record<string, unknown>).cabinDesks || 0),
      totalSeats: Number((spaceAssigned as Record<string, unknown>).totalSeats || (packageDetails as Record<string, unknown>).totalSeats || seats.length || 0),
      assignedSeats: Array.isArray((spaceAssigned as Record<string, unknown>).assignedSeats) ? (spaceAssigned as Record<string, unknown>).assignedSeats as string[] : seats as string[],
      locationLabels: Array.isArray((spaceAssigned as Record<string, unknown>).locationLabels) ? (spaceAssigned as Record<string, unknown>).locationLabels as string[] : [],
      assignedDate: (spaceAssigned as Record<string, unknown>).assignedDate as string || space.assignedDate as string || null,
      assignedAt: (spaceAssigned as Record<string, unknown>).assignedAt as string || space.assignedDate as string || null,
      zones: String((spaceAssigned as Record<string, unknown>).area || space.floor || 'Unassigned'),
    },
    initials: getInitials(String(company.companyName || company.contactName || company.tenantCode || 'TC')),
  };
}

function buildEditForm(company: TenantCompany): EditForm {
  return {
    companyName: company.name || '',
    businessType: company.businessType || '',
    contactPerson: company.contactPerson || '',
    email: company.email || '',
    phone: company.phone || '',
    customerDetails: {
      clientName: company.customerDetails?.clientName || company.name || '',
      sector: company.customerDetails?.sector || company.businessType || '',
      hoCountry: company.customerDetails?.hoCountry || '',
      hoState: company.customerDetails?.hoState || '',
      hoCity: company.customerDetails?.hoCity || '',
    },
    companyDetails: {
      buildingName: company.companyDetails?.buildingName || '',
      unitNo: company.companyDetails?.unitNo || '',
      cabinDesks: String(company.companyDetails?.cabinDesks || ''),
      ratePerCabinDesk: String(company.companyDetails?.ratePerCabinDesk || ''),
      openDesks: String(company.companyDetails?.openDesks || ''),
      ratePerOpenDesk: String(company.companyDetails?.ratePerOpenDesk || ''),
      status: company.companyDetails?.status || company.status || 'Active',
    },
    agreementDetails: {
      annualIncrement: String(company.agreementDetails?.annualIncrement || ''),
      perDeskMeetingCredits: String(company.agreementDetails?.perDeskMeetingCredits || ''),
      totalMeetingCredits: String(company.agreementDetails?.totalMeetingCredits || company.creditsAllocated || ''),
      startDate: company.agreementDetailsAt?.startDate ? toDateInputValue(company.agreementDetailsAt.startDate) : (company.contractStartAt ? toDateInputValue(company.contractStartAt) : ''),
      endDate: company.agreementDetailsAt?.endDate ? toDateInputValue(company.agreementDetailsAt.endDate) : (company.contractEndAt ? toDateInputValue(company.contractEndAt) : ''),
      lockInPeriod: String(company.agreementDetails?.lockInPeriod || company.contractDurationMonths || ''),

    },
    pocDetails: {
      localPocName: company.pocDetails?.localPocName || company.contactPerson || '',
      localPocEmail: company.pocDetails?.localPocEmail || company.email || '',
      localPocPhone: company.pocDetails?.localPocPhone || company.phone || '',
      hoPocName: company.pocDetails?.hoPocName || '',
      hoPocEmail: company.pocDetails?.hoPocEmail || '',
      hoPocPhone: company.pocDetails?.hoPocPhone || '',
    },
    packageDetails: {
      packageName: company.packageDetails?.packageName || company.planType || '',
      totalSeats: String(company.packageDetails?.totalSeats || company.spaceAssigned?.totalSeats || ''),
      openDesks: String(company.packageDetails?.openDesks || ''),
      cabinDesks: String(company.packageDetails?.cabinDesks || ''),
      seatTypeVariants: toTextList(company.packageDetails?.seatTypeVariants || []),
      creditsPerSeat: String(company.packageDetails?.creditsPerSeat || ''),
      monthlyTotalCredits: String(company.packageDetails?.monthlyTotalCredits || company.creditConfiguration?.monthlyTotalCredits || Math.max(0, Number(company.creditsAllocated || 0) - Number(company.addOnCredits?.purchasedCredits || 0))),
      creditResetCycle: company.packageDetails?.creditResetCycle || 'Monthly',
      creditUsageTracking: company.packageDetails?.creditUsageTracking || '',
    },
    addOnCredits: {
      purchasedCredits: String(company.addOnCredits?.purchasedCredits || ''),
      remainingCredits: String(company.addOnCredits?.remainingCredits || Math.max(0, Number(company.creditsAllocated || 0) - Number(company.creditsUsed || 0))),
    },
    creditConfiguration: {
      monthlyTotalCredits: String(company.creditConfiguration?.monthlyTotalCredits || company.packageDetails?.monthlyTotalCredits || Math.max(0, Number(company.creditsAllocated || 0) - Number(company.addOnCredits?.purchasedCredits || 0))),
      creditResetCycle: company.creditConfiguration?.creditResetCycle || 'Monthly',
      creditUsageTracking: company.creditConfiguration?.creditUsageTracking || '',
      ratePerCredit: String(company.creditConfiguration?.ratePerCredit ?? (company as Record<string, unknown>).ratePerCredit ?? 10),
    },
    creditsUsed: String(company.creditsUsed || 0),
    notes: company.notes || '',
  };
}

function getStatusBadge(status: string): string {
  if (status === 'Active') return 'bg-green-50 text-green-600 border-green-200';
  if (status === 'Expiring Soon') return 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
  return 'bg-red-50 text-red-600 border-red-200';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdministrationTenantCompaniesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1);
  const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);
  const [isFilteringCompanies, setIsFilteringCompanies] = useState(false);
  const [companiesSummary, setCompaniesSummary] = useState({ totalTenants: 0, activeContracts: 0, expiringSoon: 0, expired: 0 });
  const companiesRequestIdRef = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLTableCellElement | null>(null);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [tenantPackages, setTenantPackages] = useState<Array<Record<string, unknown>>>([]);
  const [editingCompany, setEditingCompany] = useState<TenantCompany | null>(null);
  const [renewingContract, setRenewingContract] = useState<TenantCompany | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [renewForm, setRenewForm] = useState({ extendMonths: '12', addCredits: '1000' });
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [isAgreementUploading, setIsAgreementUploading] = useState(false);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [showCustomSector, setShowCustomSector] = useState(false);

  const SECTOR_OPTIONS = [
    'Technology', 'Finance & Banking', 'Healthcare', 'Real Estate & Construction',
    'Manufacturing', 'Education & Training', 'Retail & E-Commerce',
    'Media & Entertainment', 'Consulting', 'Legal', 'Travel & Hospitality',
    'Telecommunications', 'Energy & Utilities', 'Pharmaceuticals',
    'Insurance', 'Logistics & Transportation', 'Non-Profit',
  ];

  const allSectorOptions = useMemo(() => {
    const merged = new Set([...SECTOR_OPTIONS, ...availableSectors]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [availableSectors]);

  // ── Data Loading ──
  // Pricing-package lookup rarely changes mid-session, so it's fetched once and
  // reused (via this ref) to normalize every page of companies, instead of
  // re-fetching packages on every paginated request.
  const packageLookupRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const loadPricingPackagesLookup = useCallback(async () => {
    try {
      const packageResponse = await getPricingPackages();
      const packagePayload = packageResponse?.data || {};
      const nextAvailablePackages = Array.isArray(packagePayload.packages) ? packagePayload.packages : [];
      const nextTenantPackages = nextAvailablePackages.filter((item) => item.category === 'Tenant');
      packageLookupRef.current = new Map<string, Record<string, unknown>>(
        nextTenantPackages
          .flatMap((item) => {
            const keys = [item._id, item.recordId, item.id, item.packageCode]
              .map((value) => String(value || '').trim())
              .filter(Boolean);
            return keys.map((key) => [key, item as Record<string, unknown>] as [string, Record<string, unknown>]);
          }),
      );
      setTenantPackages(nextTenantPackages);
    } catch {
      // fall back to whatever the tenant list response includes below
    }
  }, []);

  // Loads one page of the companies list (25 at a time) applying the current
  // search/status/package filters server-side. `replace: true` swaps the list
  // (a fresh search/filter, or the initial load); otherwise the page is
  // appended for infinite scroll. A request-id guard drops stale responses if
  // filters change again before an in-flight request resolves.
  const loadCompaniesPage = useCallback(async (pageNum: number, { replace = false }: { replace?: boolean } = {}) => {
    const requestId = ++companiesRequestIdRef.current;
    if (replace) setIsFilteringCompanies(true); else setIsLoadingMoreCompanies(true);
    try {
      const response = await getTenantCompanies({
        page: pageNum,
        limit: 25,
        ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
        ...(statusFilter !== 'All Status' ? { status: statusFilter } : {}),
        ...(packageFilter !== 'All Packages' ? { packageFilter } : {}),
      });
      if (companiesRequestIdRef.current !== requestId) return;
      const payload = response?.data || {};
      if (packageLookupRef.current.size === 0 && Array.isArray(payload.packages) && payload.packages.length) {
        const fallbackTenantPackages = payload.packages.filter((item: Record<string, unknown>) => item.category === 'Tenant');
        packageLookupRef.current = new Map<string, Record<string, unknown>>(
          fallbackTenantPackages.flatMap((item: Record<string, unknown>) => {
            const keys = [item._id, item.recordId, item.id, item.packageCode]
              .map((value) => String(value || '').trim())
              .filter(Boolean);
            return keys.map((key) => [key, item] as [string, Record<string, unknown>]);
          }),
        );
        setTenantPackages(fallbackTenantPackages as Array<Record<string, unknown>>);
      }
      const nextCompanies = Array.isArray(payload.tenants)
        ? payload.tenants.map((company: Record<string, unknown>) => normalizeTenantCompany(company, packageLookupRef.current))
        : [];
      setCompanies((current) => (replace ? nextCompanies : [...current, ...nextCompanies]));
      setCompaniesPage(Number(payload.page) || pageNum);
      setCompaniesTotalPages(Math.max(1, Number(payload.totalPages) || 1));
      if (payload.summary) setCompaniesSummary(payload.summary);
    } catch (error: unknown) {
      if (companiesRequestIdRef.current === requestId) {
        toast.error((error as Error).message || 'Failed to load tenant companies.');
        if (replace) setCompanies([]);
      }
    } finally {
      if (companiesRequestIdRef.current === requestId) {
        if (replace) setIsFilteringCompanies(false); else setIsLoadingMoreCompanies(false);
      }
    }
  }, [debouncedSearchQuery, statusFilter, packageFilter]);

  // Fetches just the one company that changed after an edit/renew/upload,
  // patching it into the loaded list in place — far cheaper than reloading the
  // whole (now paginated) list, and doesn't disturb scroll position.
  async function refreshSingleCompany(companyId: string): Promise<TenantCompany | null> {
    try {
      const response = await getTenantCompany(companyId);
      const tenant = response?.data?.tenant;
      if (!tenant) return null;
      const normalized = normalizeTenantCompany(tenant, packageLookupRef.current);
      setCompanies((current) => current.map((c) => ((c.recordId || c.id) === (normalized.recordId || normalized.id) ? normalized : c)));
      return normalized;
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to refresh tenant company.');
      return null;
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      setIsLoading(true);
      await loadPricingPackagesLookup();
      if (isMounted) await loadCompaniesPage(1, { replace: true });
      if (isMounted) setIsLoading(false);
    }
    loadInitial();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search box updates on every keystroke; debounce it before it drives a server request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Re-run the search from page 1 whenever the debounced search text or the
  // status/package filter changes — skip the very first run since the mount
  // effect above already loaded page 1.
  const didMountFiltersRef = useRef(false);
  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }
    loadCompaniesPage(1, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, statusFilter, packageFilter]);

  // Infinite scroll: observe a sentinel row at the bottom of the table and load
  // the next page once it scrolls into view.
  useEffect(() => {
    if (companiesPage >= companiesTotalPages) return undefined;
    const node = loadMoreSentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMoreCompanies) {
          loadCompaniesPage(companiesPage + 1, { replace: false });
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [companiesPage, companiesTotalPages, isLoadingMoreCompanies, loadCompaniesPage]);

  // Catches changes made in another tab — a lightweight summary-only refresh
  // (not a full list reload) so scroll position and loaded rows stay put.
  const refreshCompaniesSummary = useCallback(async () => {
    try {
      const response = await getTenantCompanies({ page: 1, limit: 1 });
      const payload = response?.data || {};
      if (payload.summary) setCompaniesSummary(payload.summary);
    } catch {
      // best-effort background refresh; ignore failures
    }
  }, []);

  useEffect(() => {
    window.addEventListener('focus', refreshCompaniesSummary);
    return () => window.removeEventListener('focus', refreshCompaniesSummary);
  }, [refreshCompaniesSummary]);

  const filteredCompanies = companies;

  const stats = useMemo(() => ({
    totalTenants: companiesSummary.totalTenants,
    activeContracts: companiesSummary.activeContracts,
    expiringSoon: companiesSummary.expiringSoon,
    expiredContracts: companiesSummary.expired,
  }), [companiesSummary]);

  // ── Handlers (commented out backend calls) ──

  // The list now loads 25-at-a-time via infinite scroll (server-side
  // search/status/package filtering), so `companies` only holds what's been
  // scrolled into view — export needs the complete matching set regardless.
  const handleExportCompaniesReport = async ({ format, dataWindow, period, reportMonth }: ExportParams) => {
    const reportFormat = format === 'Excel' ? 'Excel' : 'PDF';
    setIsExportingReport(reportFormat);
    try {
      const exportResponse = await getAllTenantCompanies({
        ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
        ...(statusFilter !== 'All Status' ? { status: statusFilter } : {}),
        ...(packageFilter !== 'All Packages' ? { packageFilter } : {}),
      });
      const rawExportTenants = Array.isArray(exportResponse?.data?.tenants) ? exportResponse.data.tenants : [];
      const exportCompanies = rawExportTenants.map((company: Record<string, unknown>) => normalizeTenantCompany(company, packageLookupRef.current));

      if (exportCompanies.length === 0) {
        toast.error('There are no tenant companies to export.');
        return;
      }

      const response = await createReport({
        title: 'Administration Tenant Companies',
        department: 'Administration',
        category: 'Other',
        dataWindow,
        reportMonth,
        period: period || 'Tenant Companies',
        generatedBy: 'Administration Manager',
        format: reportFormat,
        description: 'Administration tenant companies listing and contract summary.',
        sourceType: 'department-roster',
        sourceRef: 'administration-tenant-companies',
        reportRows: exportCompanies.map((company, index) => ({
          label: `${index + 1}. ${company.name || 'Tenant Company'}`,
          value: [
            company.status ? `Status: ${company.status}` : '',
            company.planType ? `Plan: ${company.planType}` : '',
            company.contactPerson ? `Contact: ${company.contactPerson}` : '',
            company.contractStart || company.contractEnd ? `Contract: ${company.contractStart || '-'} to ${company.contractEnd || '-'}` : '',
            company.creditsAllocated != null ? `Credits: ${company.creditsUsed || 0}/${company.creditsAllocated || 0}` : '',
          ].filter(Boolean).join(' | '),
        })),
        monthlyData: [],
      });
      await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Tenant companies report saved to Reports.' : 'Tenant companies report saved to Reports. Preview it before downloading.');
    } catch (error) {
      toast.error((error as Error)?.message || 'Unable to export tenant companies report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const handleExportCompanyReport = async (company: TenantCompany, format: string = 'PDF') => {
    if (!company) return;
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: `${company.name || 'Tenant Company'} Profile`,
        department: 'Administration',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: 'Tenant Company Profile',
        generatedBy: 'Administration Manager',
        format: reportFormat,
        description: `${company.name || 'Tenant Company'} profile, contract and employee summary.`,
        sourceType: 'custom',
        sourceRef: String(company.recordId || company.id || company.name || '').trim(),
        reportRows: buildTenantCompanyExportRows(company),
        monthlyData: [],
      });
      await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Company report saved to Reports.' : 'Company report saved to Reports. Preview it before downloading.');
    } catch (error) {
      toast.error((error as Error)?.message || 'Unable to export company report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const openEditModal = (company: TenantCompany) => { setEditingCompany(company); setEditForm(buildEditForm(company)); setShowCustomSector(false); setAgreementFiles([]); };
  const closeEditModal = () => { setEditingCompany(null); setEditForm(null); setAgreementFiles([]); };

  useEffect(() => {
    if (editingCompany) {
      getTenantCompanySectors()
        .then((res) => setAvailableSectors(res?.data?.sectors || []))
        .catch(() => {});
    }
  }, [editingCompany]);
  const openRenewModal = (company: TenantCompany) => { setRenewingContract(company); setRenewForm({ extendMonths: '12', addCredits: '1000' }); };
  const closeRenewModal = () => { setRenewingContract(null); setRenewForm({ extendMonths: '12', addCredits: '1000' }); };
  const updateEditSection = (section: keyof EditForm, field: string, value: string) => {
    setEditForm((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: {
          ...((current[section] as unknown as Record<string, string>) || {}),
          [field]: value,
        },
      };
    });
  };

  const handleEditSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCompany || !editForm || isSaving) return;
    setIsSaving(true);
    try {
      await updateTenantCompany(editingCompany.recordId || editingCompany.id, editForm);
      await refreshSingleCompany(editingCompany.recordId || editingCompany.id);
      toast.success('Tenant company updated successfully.');
      closeEditModal();
    } catch (error) {
      toast.error((error as Error).message || 'Unable to save tenant company.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenewSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renewingContract || isSaving) return;
    setIsSaving(true);
    try {
      const renewPayload = {
        contractDurationMonths: Number(renewForm.extendMonths) || 12,
        creditsAllocated: Number(renewForm.addCredits) || 0,
      };
      await renewTenantCompany(renewingContract.recordId || renewingContract.id, renewPayload);
      await refreshSingleCompany(renewingContract.recordId || renewingContract.id);
      toast.success('Contract renewed successfully.');
      closeRenewModal();
    } catch (error) {
      toast.error((error as Error).message || 'Unable to renew tenant company.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgreementFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreementFiles(Array.from(event.target.files || []));
  };

  const handleUploadAgreementDocuments = async () => {
    if (!editingCompany || agreementFiles.length === 0 || isAgreementUploading) return;
    setIsAgreementUploading(true);
    try {
      await uploadTenantCompanyAgreementDocuments(editingCompany.recordId || editingCompany.id, agreementFiles);
      toast.success('Agreement documents uploaded successfully.');
      setAgreementFiles([]);
      const updated = await refreshSingleCompany(editingCompany.recordId || editingCompany.id);
      if (updated) setEditingCompany(updated);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to upload agreement documents.');
    } finally {
      setIsAgreementUploading(false);
    }
  };

  if (isLoading) return <TablePageSkeleton />;

  return (
    <>
    <AppShell>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col gap-4">
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Administration Tenant Companies
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Manage client contracts, allocations and company profiles.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                              <ReportExportButton onClick={() => setShowExportModal(true)} />
                            </div>
          </div>

          {/* Stat Cards */}
          <div data-tour="admin-tenant-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Tenants', value: String(stats.totalTenants), icon: Building2, borderClass: '', iconClass: 'bg-slate-50 text-slate-600' },
              { key: 'active', label: 'Active Contracts', value: String(stats.activeContracts), icon: CheckCircle2, borderClass: 'border-l-4 border-l-green-500', iconClass: 'bg-green-50 text-green-600' },
              { key: 'expiring', label: 'Expiring Soon', value: String(stats.expiringSoon), icon: AlertTriangle, borderClass: 'border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
              { key: 'expired', label: 'Expired Contracts', value: String(stats.expiredContracts), icon: XCircle, borderClass: 'border-l-4 border-l-red-500', iconClass: 'bg-red-50 text-red-600' },
            ].map((card) => {
              const Icon = card.icon;
              const labelToneClass = card.borderClass ? (card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400') : 'text-slate-400';
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Panel Header */}
            <div data-tour="admin-tenant-tabs" className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All Status', 'Active', 'Expiring Soon', 'Expired'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all ${
                      statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {status === 'All Status' ? 'All' : status}
                  </button>
                ))}
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    data-tour="admin-tenant-search"
                    type="text"
                    placeholder="Search company or contact..."
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-500 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <select
                  data-tour="admin-tenant-status-select"
                  className="min-w-[140px] cursor-pointer appearance-none rounded-lg border border-blue-100 bg-blue-50/50 py-2.5 pl-3 pr-8 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] shadow-sm outline-none hover:bg-blue-50"
                  value={packageFilter}
                  onChange={(event) => setPackageFilter(event.target.value)}
                >
                  <option>All Packages</option>
                  {tenantPackages.map((pkg) => (
                    <option key={String(pkg.recordId || pkg.id)} value={String(pkg.name)}>{String(pkg.name)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table data-tour="admin-tenant-table" className="w-full min-w-[1120px] text-left font-pmedium">
                <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-4 min-w-[240px]">Company Info</th>
                    <th className="px-5 py-4 min-w-[200px]">Contact Details</th>
                    <th className="px-5 py-4">Contract Period</th>
                    <th className="px-5 py-4">Package & Credits</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {filteredCompanies.map((company) => (
                    <tr key={company.recordId || company.id} className="group transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-pmedium shadow-sm shrink-0 border border-slate-200">
                            {company.initials}
                          </div>
                          <div>
                            <p className="font-pmedium text-primary text-sm break-words" title={company.name}>{company.name}</p>
                            <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mt-0.5">{company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        <p className="font-pmedium text-slate-800 text-xs break-words">{company.contactPerson}</p>
                        <p className="text-[10px] font-pmedium text-slate-500 flex items-center gap-1.5"><Mail size={10} /> <span className="break-all">{company.email}</span></p>
                        <p className="text-[10px] font-pmedium text-slate-500 flex items-center gap-1.5"><Phone size={10} /> {company.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-xs font-pmedium text-slate-700">{company.contractStart}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <p className="text-xs font-pmedium text-slate-700">{company.contractEnd}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 space-y-1.5">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-pmedium uppercase tracking-wider">
                          {company.packageName || company.planType}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-pmedium text-slate-600">
                          <CreditCard size={12} className="text-slate-400" /> {company.creditsUsed} / {company.creditsAllocated} Cr
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-wider ${getStatusBadge(company.status)}`}>{company.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button onClick={() => navigate(`/department-accesses/administration-department/tenant-companies/${company.recordId || company.id}`)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm" title="View Details">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEditModal(company)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all shadow-sm" title="Edit Company Record">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => openRenewModal(company)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 rounded-lg transition-all shadow-sm" title="Renew Contract">
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && !isFilteringCompanies && (
                    <tr><td colSpan={6} className="py-16 text-center font-pmedium text-slate-400">No tenant companies found matching your filters.</td></tr>
                  )}
                  {isFilteringCompanies && (
                    <tr><td colSpan={6} className="py-16 text-center font-pmedium text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Searching...</span>
                    </td></tr>
                  )}
                  {filteredCompanies.length > 0 && companiesPage < companiesTotalPages && (
                    <tr>
                      <td colSpan={6} ref={loadMoreSentinelRef} className="py-6 text-center text-[11px] font-pmedium text-slate-400">
                        {isLoadingMoreCompanies && (
                          <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Loading more...</span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </PageFrame>
      </div>


        {renewingContract && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white"><RefreshCw size={18} /></div>
                  <h3 className="text-base font-pmedium text-slate-800">Renew Contract</h3>
                </div>
                <button onClick={closeRenewModal} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleRenewSave} className="space-y-4 p-5">
                <div className="flex items-start gap-1.5 rounded-xl bg-blue-50 p-2.5 text-[10px] font-pmedium text-blue-800">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  <p>Finance gets notified automatically upon saving. Contract dates will be updated from the tenant company API.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Extend Duration</label>
                  <select className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={renewForm.extendMonths} onChange={(event) => setRenewForm({ ...renewForm, extendMonths: event.target.value })}>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Add More Credits</label>
                  <input type="number" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={renewForm.addCredits} onChange={(event) => setRenewForm({ ...renewForm, addCredits: event.target.value })} min="0" step="100" />
                </div>
                <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2.5 text-xs font-pmedium text-white transition-all hover:bg-[#2563EB]/90"><Save size={14} /> Update Contract</button>
              </form>
            </div>
          </div>
        )}

        {editingCompany && editForm && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50/30 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white"><Edit size={18} /></div>
                  <div>
                    <h3 className="text-base font-pmedium text-slate-800">Edit Tenant Details</h3>
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5">Editing: {editingCompany.name}</p>
                  </div>
                </div>
                <button onClick={closeEditModal} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                <div className="grid gap-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Users size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Profile & Contact</span></h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Company Name</label>
                        <input required type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyName} onChange={(event) => setEditForm((current) => current && ({ ...current, companyName: event.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Business Type</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.businessType} onChange={(event) => setEditForm((current) => current && ({ ...current, businessType: event.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Contact Person</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.contactPerson} onChange={(event) => setEditForm((current) => current && ({ ...current, contactPerson: event.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Email</label>
                        <input type="email" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.email} onChange={(event) => setEditForm((current) => current && ({ ...current, email: event.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Phone</label>
                        <input type="tel" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.phone} onChange={(event) => setEditForm((current) => current && ({ ...current, phone: event.target.value }))} />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Company Details</span></h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Building Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.buildingName} onChange={(event) => updateEditSection('companyDetails', 'buildingName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Unit No</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.unitNo} onChange={(event) => updateEditSection('companyDetails', 'unitNo', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Cabin Desks</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.cabinDesks} onChange={(event) => updateEditSection('companyDetails', 'cabinDesks', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Rate Per Cabin Desk</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.ratePerCabinDesk} onChange={(event) => updateEditSection('companyDetails', 'ratePerCabinDesk', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Open Desks</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.openDesks} onChange={(event) => updateEditSection('companyDetails', 'openDesks', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Rate Per Open Desk</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.companyDetails.ratePerOpenDesk} onChange={(event) => updateEditSection('companyDetails', 'ratePerOpenDesk', event.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Status</label>
                        <select className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={editForm.companyDetails.status} onChange={(event) => updateEditSection('companyDetails', 'status', event.target.value)}>
                          <option>Active</option>
                          <option>Expiring Soon</option>
                          <option>Expired</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Customer Details</span></h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Client Name</label>
                        <input required type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.customerDetails.clientName} onChange={(event) => updateEditSection('customerDetails', 'clientName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Sector</label>
                        {!showCustomSector ? (
                          <div className="space-y-1.5">
                            <select
                              className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                              value={allSectorOptions.includes(editForm.customerDetails.sector) ? editForm.customerDetails.sector : ''}
                              onChange={(event) => { setShowCustomSector(false); updateEditSection('customerDetails', 'sector', event.target.value); }}
                            >
                              <option value="">Select sector</option>
                              {allSectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => { setShowCustomSector(true); updateEditSection('customerDetails', 'sector', ''); }}
                              className="text-[10px] font-pmedium text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              + Add custom sector
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              required
                              type="text"
                              placeholder="Type new sector name"
                              className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={editForm.customerDetails.sector}
                              onChange={(event) => updateEditSection('customerDetails', 'sector', event.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => { setShowCustomSector(false); updateEditSection('customerDetails', 'sector', ''); }}
                              className="text-[10px] font-pmedium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Cancel &amp; pick from list
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">HO Country</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.customerDetails.hoCountry} onChange={(event) => updateEditSection('customerDetails', 'hoCountry', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">HO State</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.customerDetails.hoState} onChange={(event) => updateEditSection('customerDetails', 'hoState', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-wider text-slate-500">HO City</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-sm font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.customerDetails.hoCity} onChange={(event) => updateEditSection('customerDetails', 'hoCity', event.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Phone size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">POC Details</span></h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Local POC Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.localPocName} onChange={(event) => updateEditSection('pocDetails', 'localPocName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Local POC Email</label>
                        <input type="email" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.localPocEmail} onChange={(event) => updateEditSection('pocDetails', 'localPocEmail', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Local POC Phone</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.localPocPhone} onChange={(event) => updateEditSection('pocDetails', 'localPocPhone', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">HO POC Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.hoPocName} onChange={(event) => updateEditSection('pocDetails', 'hoPocName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">HO POC Email</label>
                        <input type="email" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.hoPocEmail} onChange={(event) => updateEditSection('pocDetails', 'hoPocEmail', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">HO POC Phone</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.pocDetails.hoPocPhone} onChange={(event) => updateEditSection('pocDetails', 'hoPocPhone', event.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Agreement Details</span></h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Start Date</label>
                        <input type="date" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.agreementDetails.startDate} onChange={(event) => updateEditSection('agreementDetails', 'startDate', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">End Date</label>
                        <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-pmedium text-slate-500 outline-none" value={editForm.agreementDetails.endDate} readOnly />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Lock-in Period (Months)</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.agreementDetails.lockInPeriod} onChange={(event) => updateEditSection('agreementDetails', 'lockInPeriod', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Annual Increment</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.agreementDetails.annualIncrement} onChange={(event) => updateEditSection('agreementDetails', 'annualIncrement', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Per Desk Meeting Credits</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.agreementDetails.perDeskMeetingCredits} onChange={(event) => updateEditSection('agreementDetails', 'perDeskMeetingCredits', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Total Meeting Credits</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.agreementDetails.totalMeetingCredits} onChange={(event) => updateEditSection('agreementDetails', 'totalMeetingCredits', event.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><CreditCard size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Package & Credits</span></h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Package Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.packageDetails.packageName} onChange={(event) => updateEditSection('packageDetails', 'packageName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Open Desks</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.packageDetails.openDesks} onChange={(event) => updateEditSection('packageDetails', 'openDesks', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Cabin Desks</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.packageDetails.cabinDesks} onChange={(event) => updateEditSection('packageDetails', 'cabinDesks', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Credits Per Seat</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.packageDetails.creditsPerSeat} onChange={(event) => updateEditSection('packageDetails', 'creditsPerSeat', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Monthly Total Credits</label>
                        <input type="number" className="w-full rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs font-pmedium text-sky-700 outline-none" value={calculatePackageMonthlyCredits(editForm.packageDetails)} readOnly />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Credit Reset Cycle</label>
                        <select className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer" value={editForm.creditConfiguration.creditResetCycle} onChange={(event) => { updateEditSection('creditConfiguration', 'creditResetCycle', event.target.value); updateEditSection('packageDetails', 'creditResetCycle', event.target.value); }}>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Rate per Credit (Purchase)</label>
                        <input type="number" min="0" step="0.01" title="Price the tenant pays per credit when buying more (default 10)" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.creditConfiguration.ratePerCredit ?? '10'} onChange={(event) => updateEditSection('creditConfiguration', 'ratePerCredit', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Purchased Credits</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.addOnCredits.purchasedCredits} onChange={(event) => updateEditSection('addOnCredits', 'purchasedCredits', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Remaining Credits</label>
                        <input type="number" className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-pmedium text-emerald-700 outline-none" value={calculateRemainingCredits(editForm)} readOnly />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[9px] font-pmedium uppercase tracking-wider text-slate-500">Credit Usage Tracking</label>
                        <textarea rows={3} className="w-full rounded-xl border border-slate-200/60 bg-white p-2.5 text-xs font-pmedium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" value={editForm.packageDetails.creditUsageTracking} onChange={(event) => { updateEditSection('packageDetails', 'creditUsageTracking', event.target.value); updateEditSection('creditConfiguration', 'creditUsageTracking', event.target.value); }} placeholder="Track monthly usage, add-on consumption, and renewal notes here." />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="flex items-center gap-2.5 border-b border-slate-100 pb-2"><span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><FileText size={16} /></span><span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Upload Document</span></h4>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <label className="block text-[10px] font-pmedium text-amber-700 uppercase tracking-widest mb-2">Upload Agreement Document</label>
                      <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/jpg"
                          onChange={handleAgreementFilesChange}
                          className="block w-full text-xs font-pmedium text-slate-700 border-none outline-none focus:ring-0 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-[10px] file:font-pmedium file:uppercase file:tracking-wider file:text-white hover:file:bg-amber-700"
                        />
                      </div>
                      {agreementFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {agreementFiles.map((file) => (
                            <span key={`${file.name}-${file.lastModified}`} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-amber-700">{file.name}</span>
                          ))}
                          <button type="button" onClick={handleUploadAgreementDocuments} disabled={isAgreementUploading} className="rounded-xl bg-amber-600 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
                            {isAgreementUploading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      )}
                      {(editingCompany.agreementDocuments || []).length > 0 ? (
                        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(editingCompany.agreementDocuments || []).map((document) => (
                            <a key={`${document.publicId || document.url || document.name}`} href={document.url} target="_blank" rel="noreferrer"
                              className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50"
                            >
                              <div className="flex items-start gap-2">
                                <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600"><FileText size={14} /></div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-pmedium text-slate-900">{document.name}</p>
                                  <p className="mt-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{document.type || 'document'}{document.size ? ` | ${document.size}` : ''}</p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[10px] font-pmedium uppercase tracking-widest text-amber-600">No agreement documents uploaded yet.</p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 sticky bottom-0 bg-slate-50/30">
                  <button type="button" onClick={closeEditModal} className="rounded-xl px-4 py-2 text-xs font-pmedium text-slate-600 transition-all hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-pmedium text-white transition-all hover:bg-[#2563EB]/90 disabled:cursor-not-allowed disabled:opacity-60">
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AppShell>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Tenant Companies"
        subtitle="Select format and date range to export."
        department="Administration"
        category="Other"
        sourceRef="administration-tenant-companies"
        reportTitle="Administration Tenant Companies"
        defaultDataWindow="Custom"
        onExport={handleExportCompaniesReport}
      />
    </>
  );
}
