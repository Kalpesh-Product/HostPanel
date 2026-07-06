import React, { useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import PageFrame from '@/components/Pages/PageFrame';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { createReport } from '@/services/reports';
import {
  addTenantCompanyEmployee,
  deleteTenantCompanyEmployee,
  getTenantCompanies,
  getTenantCompanySectors,
  renewTenantCompany,
  uploadTenantCompanyAgreementDocuments,
  updateTenantCompanyEmployee,
  updateTenantCompany,
  updateTenantCompanyManager,
  updateTenantCompanyEmployeeStatus,
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
  LayoutGrid,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Save,
  History,
  MapPin,
  Briefcase,
  FileText,
  FileDown,
  FileSpreadsheet,
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
}

interface EditForm {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [viewingCompany, setViewingCompany] = useState<TenantCompany | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingCompany, setEditingCompany] = useState<TenantCompany | null>(null);
  const [renewingContract, setRenewingContract] = useState<TenantCompany | null>(null);
  const [addingEmployeeTo, setAddingEmployeeTo] = useState<TenantCompany | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', phone: '', designation: '', role: 'Employee' });
  const [employeeEditForm, setEmployeeEditForm] = useState({ name: '', phone: '', designation: '', role: 'Employee' });
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
  async function loadTenantCompanies({ silent = false } = {}) {
    if (!silent) setIsLoading(true);
    try {
      const [tenantResponse, packageResponse] = await Promise.allSettled([getTenantCompanies(), getPricingPackages()]);
      const tenantPayload = tenantResponse.status === 'fulfilled' ? (tenantResponse.value?.data || {}) : {};
      const packagePayload = packageResponse.status === 'fulfilled' ? (packageResponse.value?.data || {}) : {};
      const nextAvailablePackages = Array.isArray(packagePayload.packages)
        ? packagePayload.packages
        : Array.isArray(tenantPayload.packages)
          ? tenantPayload.packages
          : [];
      const nextPackageLookup = new Map<string, Record<string, unknown>>(
        nextAvailablePackages
          .filter((item) => item.category === 'Tenant')
          .flatMap((item) => {
            const keys = [item._id, item.recordId, item.id, item.packageCode]
              .map((value) => String(value || '').trim())
              .filter(Boolean);
            return keys.map((key) => [key, item as Record<string, unknown>] as [string, Record<string, unknown>]);
          }),
      );
      const nextCompanies = Array.isArray(tenantPayload.tenants)
        ? tenantPayload.tenants.map((company) => normalizeTenantCompany(company, nextPackageLookup))
        : [];
      setCompanies(nextCompanies);
      return nextCompanies;
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to load tenant companies.');
      setCompanies([]);
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => { loadTenantCompanies(); }, []);

  useEffect(() => {
    const handleFocus = () => { loadTenantCompanies({ silent: true }); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return companies.filter((company) => (
      (statusFilter === 'All Status' || company.status === statusFilter) &&
      (company.name.toLowerCase().includes(query) || company.contactPerson.toLowerCase().includes(query) || company.id.toLowerCase().includes(query))
    ));
  }, [companies, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    totalTenants: companies.length,
    activeContracts: companies.filter((company) => company.status === 'Active').length,
    expiringSoon: companies.filter((company) => company.status === 'Expiring Soon').length,
    totalCreditsIssued: companies.reduce((sum, company) => sum + Number(company.creditsAllocated || 0), 0),
  }), [companies]);

  const viewingCompanyEmployees = useMemo(
    () => normalizeTenantEmployees(viewingCompany?.employees, viewingCompany?.managerEmployeeId),
    [viewingCompany?.employees, viewingCompany?.managerEmployeeId],
  );

  // ── Handlers (commented out backend calls) ──

  const handleExportCompaniesReport = async (format: string = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    if (filteredCompanies.length === 0) {
      toast.error('There are no tenant companies to export.');
      return;
    }
    setIsExportingReport(reportFormat);
    try {
      const response = await createReport({
        title: 'Administration Tenant Companies',
        department: 'Administration',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: 'Tenant Companies',
        generatedBy: 'Administration Manager',
        format: reportFormat,
        description: 'Administration tenant companies listing and contract summary.',
        sourceType: 'department-roster',
        sourceRef: 'administration-tenant-companies',
        reportRows: filteredCompanies.map((company, index) => ({
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
      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
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
      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Company report saved to Reports.' : 'Company report saved to Reports. Preview it before downloading.');
    } catch (error) {
      toast.error((error as Error)?.message || 'Unable to export company report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const openEditModal = (company: TenantCompany) => { setEditingCompany(company); setEditForm(buildEditForm(company)); setShowCustomSector(false); };
  const closeEditModal = () => { setEditingCompany(null); setEditForm(null); };

  useEffect(() => {
    if (editingCompany) {
      getTenantCompanySectors()
        .then((res) => setAvailableSectors(res?.data?.sectors || []))
        .catch(() => {});
    }
  }, [editingCompany]);
  const openRenewModal = (company: TenantCompany) => { setRenewingContract(company); setRenewForm({ extendMonths: '12', addCredits: '1000' }); };
  const closeRenewModal = () => { setRenewingContract(null); setRenewForm({ extendMonths: '12', addCredits: '1000' }); };
  const openAddEmployeeModal = (company: TenantCompany) => { setAddingEmployeeTo(company); setEmployeeForm({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); };
  const closeAddEmployeeModal = () => { setAddingEmployeeTo(null); setEmployeeForm({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); };
  const openEditEmployeeModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeEditForm({ name: employee?.name || '', phone: employee?.phone || '', designation: employee?.designation || '', role: employee?.role || 'Employee' });
  };
  const closeEditEmployeeModal = () => { setEditingEmployee(null); setEmployeeEditForm({ name: '', phone: '', designation: '', role: 'Employee' }); };
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
      await loadTenantCompanies({ silent: true });
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
      await loadTenantCompanies({ silent: true });
      toast.success('Contract renewed successfully.');
      closeRenewModal();
    } catch (error) {
      toast.error((error as Error).message || 'Unable to renew tenant company.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addingEmployeeTo || isSaving) return;
    setIsSaving(true);
    try {
      await addTenantCompanyEmployee(addingEmployeeTo.recordId || addingEmployeeTo.id, employeeForm);
      await loadTenantCompanies({ silent: true });
      toast.success('Employee added successfully.');
      closeAddEmployeeModal();
      setViewingCompany(null);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to add employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmployeeEditSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewingCompany || !editingEmployee || isSaving) return;
    setIsSaving(true);
    try {
      await updateTenantCompanyEmployee(viewingCompany.recordId || viewingCompany.id, editingEmployee.id || '', employeeEditForm);
      await loadTenantCompanies({ silent: true });
      toast.success('Employee details updated successfully.');
      closeEditEmployeeModal();
    } catch (error) {
      toast.error((error as Error).message || 'Unable to update employee details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgreementFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreementFiles(Array.from(event.target.files || []));
  };

  const handleUploadAgreementDocuments = async () => {
    if (!viewingCompany || agreementFiles.length === 0 || isAgreementUploading) return;
    setIsAgreementUploading(true);
    try {
      await uploadTenantCompanyAgreementDocuments(viewingCompany.recordId || viewingCompany.id, agreementFiles);
      toast.success('Agreement documents uploaded successfully.');
      setAgreementFiles([]);
      loadTenantCompanies({ silent: true });
    } catch (error) {
      toast.error((error as Error).message || 'Unable to upload agreement documents.');
    } finally {
      setIsAgreementUploading(false);
    }
  };

  const handleAssignManager = async (employeeId: string) => {
    if (!viewingCompany || isSaving) return;
    setIsSaving(true);
    try {
      await updateTenantCompanyManager(viewingCompany.recordId || viewingCompany.id, { employeeId });
      await loadTenantCompanies({ silent: true });
      toast.success('Manager updated successfully.');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to update manager.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    if (!viewingCompany || isSaving) return;
    setIsSaving(true);
    try {
      await updateTenantCompanyEmployeeStatus(viewingCompany.recordId || viewingCompany.id, employeeId, { status: 'Inactive' });
      await loadTenantCompanies({ silent: true });
      toast.success('Employee status updated.');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to update employee status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!viewingCompany || isSaving) return;
    setIsSaving(true);
    try {
      await deleteTenantCompanyEmployee(viewingCompany.recordId || viewingCompany.id, employeeId);
      await loadTenantCompanies({ silent: true });
      toast.success('Employee removed successfully.');
      setSelectedEmployee(null);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to remove employee.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <TablePageSkeleton />;

  return (
    <AppShell>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col gap-4">
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Administration Tenant Companies
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">View Added Tenant Companies and Add its Employees</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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

          {/* Pill Tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Companies' },
              { key: 'active', label: 'Active' },
              { key: 'expiring', label: 'Expiring Soon' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key === 'all' ? 'All Status' : tab.key === 'active' ? 'Active' : 'Expiring Soon')}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  (tab.key === 'all' && statusFilter === 'All Status') ||
                  (tab.key === 'active' && statusFilter === 'Active') ||
                  (tab.key === 'expiring' && statusFilter === 'Expiring Soon')
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Tenants', value: String(stats.totalTenants), icon: Building2 },
              { key: 'active', label: 'Active Contracts', value: String(stats.activeContracts), icon: CheckCircle2 },
              { key: 'expiring', label: 'Expiring Soon', value: String(stats.expiringSoon), icon: AlertTriangle },
              { key: 'credits', label: 'Total Credits Issued', value: String(stats.totalCreditsIssued), icon: CreditCard },
            ].map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-green-500', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-blue-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-green-50 text-green-600', 'bg-amber-50 text-amber-600', 'bg-blue-50 text-blue-600'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Panel */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Panel Header */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <select
                  className="w-full sm:w-44 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Expiring Soon</option>
                  <option>Expired</option>
                </select>
              </div>
                <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search company or contact..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <table className="w-full table-auto text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                <tr>
                  <th className="px-3 py-4 text-left whitespace-nowrap">Tenant Company</th>
                  <th className="px-3 py-4 text-left whitespace-nowrap">Plan & Contract Dates</th>
                  <th className="px-3 py-4 text-center whitespace-nowrap">Credits (Used / Total)</th>
                  <th className="px-3 py-4 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 py-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredCompanies.map((company) => {
                  const progress = company.creditsAllocated > 0 ? company.creditsUsed / company.creditsAllocated : 0;
                  return (
                    <tr key={company.recordId || company.id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-3 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">{company.initials}</div><div><div className="font-pmedium text-primary text-sm">{company.name}</div></div></div></td>
                      <td className="px-3 py-4"><span className="text-xs font-bold text-slate-700">{company.planType}</span><p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Calendar size={10} />{company.contractStart} - {company.contractEnd}</p></td>
                      <td className="px-3 py-4"><div className="flex items-center justify-center gap-2"><span className="text-sm font-black text-slate-900">{company.creditsUsed}</span><span className="text-[10px] font-bold text-slate-600">/ {company.creditsAllocated}</span></div><div className="mx-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress > 0.9 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress * 100, 100)}%` }} /></div></td>
                      <td className="px-3 py-4 text-center"><span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getStatusBadge(company.status)}`}>{company.status}</span></td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => { setViewingCompany(company); setActiveDetailTab('summary'); setAgreementFiles([]); }} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm" title="View Details"><Eye size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompanies.length === 0 && <tr><td colSpan={5} className="px-3 py-20 text-center font-bold text-slate-400">No tenant companies found matching your filters.</td></tr>}
              </tbody>
            </table>
          </div>
          </div>
        </PageFrame>
      </div>

        {viewingCompany && (
          <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Building2 className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-pmedium text-primary">{viewingCompany.name}</h2>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getStatusBadge(viewingCompany.status)}`}>{viewingCompany.status}</span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500"><Briefcase size={10} /> {viewingCompany.businessType || 'Tenant Company'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                type="button"
                onClick={() => handleExportCompaniesReport('PDF')}
                disabled={Boolean(isExportingReport)}
                title="Export PDF"
                className="px-3 py-2 bg-white text-[#f10505] rounded-xl font-black text-[9px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown size={12} /> {isExportingReport === 'PDF' ? '...' : ''}
                
              </button>
              <button
                type="button"
                onClick={() => handleExportCompaniesReport('Excel')}
                disabled={Boolean(isExportingReport)}
                title="Export Excel"
                className="px-3 py-2 bg-[#ffffff] text-[#1fd628] rounded-xl font-black text-[9px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSpreadsheet size={12} /> {isExportingReport === 'Excel' ? '...' : ''}
                
              </button>
                  <button onClick={() => { setViewingCompany(null); setSelectedEmployee(null); setEditingEmployee(null); setAgreementFiles([]); }} className="rounded-xl border border-slate-200 bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-100 bg-white px-4 pt-3">
                {[
                  { id: 'summary', label: 'Company Summary', icon: <LayoutGrid size={16} /> },
                  { id: 'employees', label: 'Employees', icon: <Users size={16} /> },
                  { id: 'credits', label: 'Credit Usage', icon: <History size={16} /> },
                  { id: 'space', label: 'Space Assignment', icon: <MapPin size={16} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-bold transition-all ${
                      activeDetailTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4">
                {activeDetailTab === 'summary' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-7">
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Contract Start</p>
                        <p className="text-xs font-bold text-slate-900">{viewingCompany.contractStart || 'N/A'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Contract End</p>
                        <p className="text-xs font-bold text-slate-900">{viewingCompany.contractEnd || 'N/A'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-blue-500">Base Credits</p>
                        <p className="text-base font-black text-blue-600">{viewingCompany.baseCreditsAllocated ?? viewingCompany.creditConfiguration?.monthlyTotalCredits ?? viewingCompany.packageDetails?.monthlyTotalCredits ?? viewingCompany.creditsAllocated}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-violet-500">Purchased</p>
                        <p className="text-base font-black text-violet-600">+{viewingCompany.purchasedCredits ?? viewingCompany.addOnCredits?.purchasedCredits ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-500">Credits Used</p>
                        <p className="text-base font-black text-emerald-600">{viewingCompany.creditsUsed}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Credits Remaining</p>
                        <p className="text-base font-black text-slate-900">{Math.max(0, Number((viewingCompany.totalCreditsAllocated ?? viewingCompany.creditsAllocated) || 0) - Number(viewingCompany.creditsUsed || 0))}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Area</p>
                        <p className="text-xs font-bold text-slate-900">{viewingCompany.spaceAssigned?.area || viewingCompany.space?.floor || 'Unassigned'}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Sales Package Summary</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Plan Type</p><p className="text-xs font-bold text-slate-900">{viewingCompany.planType || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Package Name</p><p className="text-xs font-bold text-slate-900">{viewingCompany.packageName || viewingCompany.packageDetails?.packageName || viewingCompany.planType || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Location Blocks</p><p className="text-xs font-bold text-slate-900">{viewingCompany.packageLocationLabels?.length ? viewingCompany.packageLocationLabels.join(', ') : 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Total Seats</p><p className="text-xs font-bold text-slate-900">{formatInteger(viewingCompany.packageDetails?.totalSeats || 0)}</p></div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Billing Snapshot</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Monthly Rent</p><p className="text-xs font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.monthlyRent || viewingCompany.billingDetails?.monthlyRent || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Total Contract Amount</p><p className="text-xs font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.totalContractAmount || viewingCompany.billingDetails?.totalContractAmount || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Security Deposit</p><p className="text-xs font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.securityDepositAmount || viewingCompany.billingDetails?.securityDepositAmount || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Deposit Status</p><p className="text-xs font-bold text-slate-900">{viewingCompany.billingDetails?.securityDepositPaidStatus || 'Pending'}</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Customer Profile</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Company Name</p><p className="text-xs font-bold text-slate-900">{viewingCompany.customerDetails?.clientName || viewingCompany.name}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Sector</p><p className="text-xs font-bold text-slate-900">{viewingCompany.customerDetails?.sector || viewingCompany.businessType || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO Country</p><p className="text-xs font-bold text-slate-900">{viewingCompany.customerDetails?.hoCountry || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO State</p><p className="text-xs font-bold text-slate-900">{viewingCompany.customerDetails?.hoState || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO City</p><p className="text-xs font-bold text-slate-900">{viewingCompany.customerDetails?.hoCity || 'N/A'}</p></div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Manager Assignment</h3>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400">Current Manager</p>
                            <p className="text-xs font-bold text-slate-900">{viewingCompany.managerEmployee?.name || 'No manager assigned'}</p>
                            <p className="text-[10px] text-slate-500">{viewingCompany.managerEmployee?.email || 'Assign one manager from the employee list below.'}</p>
                          </div>
                          <span className="inline-flex w-max rounded-xl border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600">
                            {viewingCompany.managerEmployeeId ? 'Manager Active' : 'Pending Assignment'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Company Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Building</p><p className="text-sm font-bold text-slate-900">{viewingCompany.companyDetails?.buildingName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Unit No.</p><p className="text-sm font-bold text-slate-900">{viewingCompany.companyDetails?.unitNo || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Open Desks</p><p className="text-sm font-bold text-slate-900">{(viewingCompany.livePricingSummary?.openDesks ?? viewingCompany.companyDetails?.openDesks) || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Cabin Desks</p><p className="text-sm font-bold text-slate-900">{(viewingCompany.livePricingSummary?.cabinDesks ?? viewingCompany.companyDetails?.cabinDesks) || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Open Desk Rate</p><p className="text-sm font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.ratePerOpenDesk || viewingCompany.companyDetails?.ratePerOpenDesk || 0)}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Cabin Desk Rate</p><p className="text-sm font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.ratePerCabinDesk || viewingCompany.companyDetails?.ratePerCabinDesk || 0)}</p></div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Package & Credits</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Plan Type</p><p className="text-sm font-bold text-slate-900">{viewingCompany.planType || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Package Name</p><p className="text-sm font-bold text-slate-900">{viewingCompany.packageDetails?.packageName || viewingCompany.planType || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Monthly Credits</p><p className="text-sm font-bold text-slate-900">{viewingCompany.packageDetails?.monthlyTotalCredits || viewingCompany.creditConfiguration?.monthlyTotalCredits || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Credits / Seat</p><p className="text-sm font-bold text-slate-900">{viewingCompany.packageDetails?.creditsPerSeat || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Credit Reset</p><p className="text-sm font-bold text-slate-900">{viewingCompany.creditConfiguration?.creditResetCycle || 'Monthly'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Usage Tracking</p><p className="text-sm font-bold text-slate-900">{viewingCompany.creditConfiguration?.creditUsageTracking || 'N/A'}</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">POC Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Name</p><p className="text-sm font-bold text-slate-900">{viewingCompany.pocDetails?.localPocName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Email</p><p className="text-sm font-bold text-slate-900 break-all">{viewingCompany.pocDetails?.localPocEmail || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Phone</p><p className="text-sm font-bold text-slate-900">{viewingCompany.pocDetails?.localPocPhone || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Name</p><p className="text-sm font-bold text-slate-900">{viewingCompany.pocDetails?.hoPocName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Email</p><p className="text-sm font-bold text-slate-900 break-all">{viewingCompany.pocDetails?.hoPocEmail || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Phone</p><p className="text-sm font-bold text-slate-900">{viewingCompany.pocDetails?.hoPocPhone || 'N/A'}</p></div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Agreement Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Annual Increment</p><p className="text-sm font-bold text-slate-900">{formatCurrency(viewingCompany.livePricingSummary?.annualIncrement || viewingCompany.agreementDetails?.annualIncrement || 0)}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Meeting Credits</p><p className="text-sm font-bold text-slate-900">{viewingCompany.agreementDetails?.totalMeetingCredits || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Lock-in Period</p><p className="text-sm font-bold text-slate-900">{viewingCompany.agreementDetails?.lockInPeriod || viewingCompany.contractDurationMonths || 0} Months</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Status</p><p className="text-sm font-bold text-slate-900">{viewingCompany.companyDetails?.status || viewingCompany.status}</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-2 lg:flex-row lg:items-end lg:justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Agreement Documents</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                            Choose File(s)
                            <input type="file" multiple accept=".pdf,.doc,.docx,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleAgreementFilesChange} />
                          </label>
                          <button type="button" onClick={handleUploadAgreementDocuments} disabled={!agreementFiles.length || isAgreementUploading}
                            className="rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >{isAgreementUploading ? 'Uploading...' : 'Upload'}</button>
                        </div>
                      </div>
                      {agreementFiles.length > 0 && (
                        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-blue-600">Selected {agreementFiles.length} file{agreementFiles.length > 1 ? 's' : ''}</p>
                      )}
                      {(viewingCompany.agreementDocuments || []).length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(viewingCompany.agreementDocuments || []).map((document) => (
                            <a key={`${document.publicId || document.url || document.name}`} href={document.url} target="_blank" rel="noreferrer"
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50"
                            >
                              <div className="flex items-start gap-2">
                                <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600"><FileText size={14} /></div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold text-slate-900">{document.name}</p>
                                  <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">{document.type || 'document'}{document.size ? ` | ${document.size}` : ''}</p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-medium text-slate-400">No agreement documents uploaded yet.</div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">Contract details are view-only for administration.</span>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'employees' && (
                  <div className="space-y-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Managed Employees</h3>
                      <button onClick={() => openAddEmployeeModal(viewingCompany)} className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100">
                        <Plus size={12} /> Add Employee
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Employee Directory</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-900">{viewingCompanyEmployees.length} managed {viewingCompanyEmployees.length === 1 ? 'employee' : 'employees'}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600"><Users size={11} /> Active roster</span>
                      </div>

                      {viewingCompanyEmployees.length > 0 ? (
                        <div className="grid gap-2">
                          {viewingCompanyEmployees.map((employee) => {
                            const statusMeta = getTenantEmployeeStatusMeta(employee);
                            const isManager = employee.role === 'Manager';
                            return (
                              <div key={employee.id || employee.email || employee.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex min-w-0 items-start gap-2">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isManager ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {getEmployeeInitials(employee)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h4 className="text-xs font-black text-slate-950">{buildEmployeeName(employee)}</h4>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isManager ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{employee.role || 'Employee'}</span>
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusMeta.className}`}>{statusMeta.label}</span>
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-semibold text-slate-500">
                                        <span className="inline-flex items-center gap-1"><Mail size={11} /> {employee.email || 'No email'}</span>
                                        {employee.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {employee.phone}</span>}
                                        <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {employee.designation || 'No designation'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
                                    <button onClick={() => setSelectedEmployee(employee)} className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">View Profile</button>
                                    {employee.status === 'Active' && !isManager && (
                                      <button onClick={() => handleAssignManager(employee.id!)} className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100">Set Manager</button>
                                    )}
                                    {employee.status === 'Active' && isManager && (
                                      <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700">Current Manager</span>
                                    )}
                                    {employee.status === 'Active' && (
                                      <button onClick={() => handleDeactivateEmployee(employee.id!)} className="rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-red-600 transition-colors hover:bg-red-100 hover:text-red-700">Deactivate</button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center">
                          <Users className="mx-auto mb-2 text-slate-300" size={24} />
                          <p className="text-xs font-bold text-slate-500">No employees found for this tenant company.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeDetailTab === 'credits' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-500">Base Allocated</p><p className="text-base font-black text-slate-900">{viewingCompany.baseCreditsAllocated ?? viewingCompany.creditConfiguration?.monthlyTotalCredits ?? viewingCompany.packageDetails?.monthlyTotalCredits ?? viewingCompany.creditsAllocated}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-violet-500">Purchased Add-ons</p><p className="text-base font-black text-violet-600">+{viewingCompany.purchasedCredits ?? viewingCompany.addOnCredits?.purchasedCredits ?? 0}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-blue-500">Credits Used</p><p className="text-base font-black text-blue-600">{viewingCompany.creditsUsed}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-green-500">Remaining Balance</p><p className="text-base font-black text-green-600">{Math.max(0, Number((viewingCompany.totalCreditsAllocated ?? viewingCompany.creditsAllocated) || 0) - Number(viewingCompany.creditsUsed || 0))}</p></div>
                    </div>

                    {Array.isArray(viewingCompany.creditHistory) && viewingCompany.creditHistory.length > 0 && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Latest Credit Entry</p>
                            <h4 className="mt-0.5 text-sm font-black text-blue-950">{viewingCompany.creditHistory[0]?.roomName || viewingCompany.creditHistory[0]?.resource || viewingCompany.creditHistory[0]?.type || 'Meeting Room Booking'}</h4>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">{viewingCompany.creditHistory[0]?.bookingCode || 'No code'}</span>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-4 text-[10px] font-bold text-blue-900">
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Scheduled Date: {viewingCompany.creditHistory[0]?.scheduledDate || viewingCompany.creditHistory[0]?.date || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Booked By: {viewingCompany.creditHistory[0]?.bookedBy || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Schedule: {viewingCompany.creditHistory[0]?.startTime || '—'} - {viewingCompany.creditHistory[0]?.endTime || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Location: {viewingCompany.creditHistory[0]?.location || '—'}{viewingCompany.creditHistory[0]?.wing ? ` • Wing ${viewingCompany.creditHistory[0]?.wing}` : ''}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Credits: {formatCreditDelta(viewingCompany.creditHistory[0])}</div>
                        </div>
                      </div>
                    )}

                    {Array.isArray(viewingCompany.creditHistory) && viewingCompany.creditHistory.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Booked On</th>
                              <th className="px-3 py-2">Booking / Room</th>
                              <th className="px-3 py-2">Scheduled For</th>
                              <th className="px-3 py-2">Location / Wing</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 text-right">Credits</th>
                              <th className="px-3 py-2 text-right">Remaining</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewingCompany.creditHistory.map((history) => (
                              <tr key={history.id}>
                                <td className="px-3 py-2 text-[10px] font-bold text-slate-500">{history.date}</td>
                                <td className="px-3 py-2">
                                  <p className="text-xs font-bold text-slate-900">{history.roomName || history.resource || history.type}</p>
                                  <p className="text-[10px] text-slate-500">{history.bookingCode || history.type}</p>
                                  <p className="text-[10px] text-slate-400">{history.resource ? `Resource: ${history.resource}` : 'Meeting room credit entry'}</p>
                                </td>
                                <td className="px-3 py-2 text-[10px] font-medium text-slate-600">
                                  <p className="font-semibold text-slate-800">{history.scheduledDate || history.date || '—'}</p>
                                  <p className="font-semibold text-slate-800">{history.startTime || '—'} - {history.endTime || '—'}</p>
                                  <p className="text-[10px] text-slate-500">{history.bookedBy || '—'}</p>
                                </td>
                                <td className="px-3 py-2 text-[10px] font-medium text-slate-600">{history.location || '—'}{history.wing ? ` • Wing ${history.wing}` : ''}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${getCreditHistoryStatusBadge(history.status || '')}`}>{history.status || 'Booked'}</span>
                                </td>
                                <td className={`px-3 py-2 text-right text-xs font-black ${Number(history.credited || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCreditDelta(history)}</td>
                                <td className="px-3 py-2 text-right text-xs font-black text-emerald-600">{history.remainingCredits ?? Math.max(0, Number(viewingCompany.creditsAllocated || 0) - Number(viewingCompany.creditsUsed || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center"><p className="text-xs font-bold text-slate-500">No credit usage recorded yet.</p></div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'space' && (
                  <div className="space-y-3">
                    <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-900">Tenant Occupied Area</h3>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <MapPin className="mb-1 text-amber-500" size={18} />
                        <p className="px-2 text-xs font-bold text-slate-900">{viewingCompany.spaceAssigned?.area || 'Unassigned'}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Area</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <LayoutGrid className="mb-1 text-blue-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{viewingCompany.spaceAssigned?.openDesks ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Open Desks</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <Building2 className="mb-1 text-purple-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{viewingCompany.spaceAssigned?.cabinDesks ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Cabin Desks</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <Users className="mb-1 text-sky-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{viewingCompany.spaceAssigned?.totalSeats ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Total Seats</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Assigned Space Breakdown</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Assigned Date</p><p className="text-xs font-bold text-slate-900">{viewingCompany.spaceAssigned?.assignedDate || 'N/A'}</p></div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold text-slate-400">Assigned Seats</p>
                            <div className="mt-0.5 flex flex-wrap gap-1.5">
                              {Array.isArray(viewingCompany.spaceAssigned?.assignedSeats) && viewingCompany.spaceAssigned.assignedSeats.length > 0 ? viewingCompany.spaceAssigned.assignedSeats.map((seat) => (
                                <span key={seat} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-700">{seat}</span>
                              )) : (
                                <span className="text-xs font-bold text-slate-300">N/A</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Location Labels</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(viewingCompany.spaceAssigned?.locationLabels) && viewingCompany.spaceAssigned.locationLabels.length > 0 ? viewingCompany.spaceAssigned.locationLabels.map((label) => (
                            <span key={label} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</span>
                          )) : (
                            <span className="text-xs font-medium text-slate-400">No assigned location labels.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedEmployee && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 p-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employee Profile</p>
                  <h3 className="mt-0.5 text-xl font-black text-slate-900">{selectedEmployee.name}</h3>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{selectedEmployee.designation || 'Tenant Employee'}</p>
                </div>
                <button onClick={() => { setSelectedEmployee(null); setEditingEmployee(null); }} className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:bg-slate-100"><X size={16} /></button>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</p><p className="mt-0.5 break-all text-xs font-bold text-slate-900">{selectedEmployee.email}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Role</p><p className="mt-0.5 text-xs font-bold text-slate-900">{selectedEmployee.role || 'Employee'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Account Status</p><p className="mt-0.5 text-xs font-bold text-slate-900">{getTenantEmployeeStatusMeta(selectedEmployee).label}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Access</p><p className="mt-0.5 text-xs font-bold text-slate-900">{selectedEmployee.status || 'Active'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Invited At</p><p className="mt-0.5 text-xs font-bold text-slate-900">{formatDateTimeLabel(selectedEmployee.invitedAt || selectedEmployee.inviteSentAt) || 'N/A'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registered At</p><p className="mt-0.5 text-xs font-bold text-slate-900">{formatDateTimeLabel(selectedEmployee.registeredAt) || 'N/A'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Login</p><p className="mt-0.5 text-xs font-bold text-slate-900">{formatDateTimeLabel(selectedEmployee.lastLoginAt) || 'Never'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tenant Link</p><p className="mt-0.5 text-xs font-bold text-slate-900">{selectedEmployee.tenantCompanyName || viewingCompany?.name || 'Tenant Company'}</p></div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white p-4">
                <button onClick={() => openEditEmployeeModal(selectedEmployee)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 transition-all hover:bg-blue-100">Edit</button>
                <button onClick={() => { if (selectedEmployee?.status === 'Active') handleDeactivateEmployee(selectedEmployee.id!); }}
                  disabled={selectedEmployee?.status !== 'Active'}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >Deactivate</button>
                <button onClick={() => handleDeleteEmployee(selectedEmployee.id!)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-100">Delete</button>
                <button onClick={() => { setSelectedEmployee(null); setEditingEmployee(null); }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800">Close</button>
              </div>
            </div>
          </div>
        )}

        {editingEmployee && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <h3 className="text-lg font-black text-slate-900">Edit Employee</h3>
                <button onClick={closeEditEmployeeModal} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleEmployeeEditSave} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Full Name</label>
                  <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.name} onChange={(event) => setEmployeeEditForm({ ...employeeEditForm, name: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Phone (Optional)</label>
                  <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.phone} onChange={(event) => setEmployeeEditForm({ ...employeeEditForm, phone: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Designation</label>
                  <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.designation} onChange={(event) => setEmployeeEditForm({ ...employeeEditForm, designation: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tenant Role</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.role} onChange={(event) => setEmployeeEditForm({ ...employeeEditForm, role: event.target.value })}>
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"><Save size={16} /> Save Employee</button>
              </form>
            </div>
          </div>
        )}

        {renewingContract && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><RefreshCw size={16} className="text-blue-600" /> Renew Contract</h3>
                <button onClick={closeRenewModal} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <form onSubmit={handleRenewSave} className="space-y-4 p-4">
                <div className="flex items-start gap-1.5 rounded-xl bg-blue-50 p-2.5 text-[10px] font-bold text-blue-800">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  <p>Finance gets notified automatically upon saving. Contract dates will be updated from the tenant company API.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Extend Duration</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none" value={renewForm.extendMonths} onChange={(event) => setRenewForm({ ...renewForm, extendMonths: event.target.value })}>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Add More Credits</label>
                  <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none" value={renewForm.addCredits} onChange={(event) => setRenewForm({ ...renewForm, addCredits: event.target.value })} min="0" step="100" />
                </div>
                <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700"><Save size={14} /> Update Contract</button>
              </form>
            </div>
          </div>
        )}

        {addingEmployeeTo && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="text-base font-black text-slate-900">Add Employee</h3>
                <button onClick={closeAddEmployeeModal} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <form onSubmit={handleAddEmployee} className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Full Name</label>
                  <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Email Address</label>
                  <input required type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Phone (Optional)</label>
                  <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Designation</label>
                  <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={employeeForm.designation} onChange={(event) => setEmployeeForm({ ...employeeForm, designation: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Tenant Role</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })}>
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <button type="submit" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700"><Mail size={14} /> Send Invite Link</button>
              </form>
            </div>
          </div>
        )}

        {editingCompany && editForm && (
          <div className="fixed inset-0 z-95 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><Edit size={16} className="text-amber-500" /> Edit Company Record</h3>
                <button onClick={closeEditModal} className="rounded-xl border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-4">
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customer Details</h4>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">Client Profile</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Company Name</label>
                        <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={editForm.customerDetails.clientName} onChange={(event) => updateEditSection('customerDetails', 'clientName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sector</label>
                        {!showCustomSector ? (
                          <div className="space-y-1.5">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none"
                              value={allSectorOptions.includes(editForm.customerDetails.sector) ? editForm.customerDetails.sector : ''}
                              onChange={(event) => { setShowCustomSector(false); updateEditSection('customerDetails', 'sector', event.target.value); }}
                            >
                              <option value="">Select sector</option>
                              {allSectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => { setShowCustomSector(true); updateEditSection('customerDetails', 'sector', ''); }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
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
                              className="w-full rounded-xl border border-indigo-200 bg-slate-50 p-2.5 text-sm font-bold outline-none"
                              value={editForm.customerDetails.sector}
                              onChange={(event) => updateEditSection('customerDetails', 'sector', event.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => { setShowCustomSector(false); updateEditSection('customerDetails', 'sector', ''); }}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Cancel &amp; pick from list
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">POC Details</h4>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">Primary Contact</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Local POC Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.pocDetails.localPocName} onChange={(event) => updateEditSection('pocDetails', 'localPocName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Local POC Email</label>
                        <input type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.pocDetails.localPocEmail} onChange={(event) => updateEditSection('pocDetails', 'localPocEmail', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Local POC Phone</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.pocDetails.localPocPhone} onChange={(event) => updateEditSection('pocDetails', 'localPocPhone', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">HO POC Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.pocDetails.hoPocName} onChange={(event) => updateEditSection('pocDetails', 'hoPocName', event.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Agreement Details</h4>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600">Contract Timeline</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Start Date</label>
                        <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.agreementDetails.startDate} onChange={(event) => updateEditSection('agreementDetails', 'startDate', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">End Date</label>
                        <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs font-bold text-slate-500 outline-none" value={editForm.agreementDetails.endDate} readOnly />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Lock-in Period</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.agreementDetails.lockInPeriod} onChange={(event) => updateEditSection('agreementDetails', 'lockInPeriod', event.target.value)} />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Package & Credits</h4>
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-violet-600">Allocation</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Package Name</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.packageDetails.packageName} onChange={(event) => updateEditSection('packageDetails', 'packageName', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Monthly Total Credits</label>
                        <input type="number" className="w-full rounded-xl border border-sky-200 bg-sky-50 p-2 text-xs font-black text-sky-700 outline-none" value={calculatePackageMonthlyCredits(editForm.packageDetails)} readOnly />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Purchased Credits</label>
                        <input type="number" min="0" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none" value={editForm.addOnCredits.purchasedCredits} onChange={(event) => updateEditSection('addOnCredits', 'purchasedCredits', event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">Remaining Credits</label>
                        <input type="number" className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs font-black text-emerald-700 outline-none" value={calculateRemainingCredits(editForm)} readOnly />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={closeEditModal} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AppShell>
  );
}
