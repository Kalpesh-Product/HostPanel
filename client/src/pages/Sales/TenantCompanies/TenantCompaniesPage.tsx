import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Building, Search, Plus, Eye, Edit, CalendarDays, LayoutGrid,
  CheckCircle2, AlertTriangle, XCircle, Mail, Phone, Clock,
  CreditCard, X, ArrowRight, Save, RefreshCw, Briefcase,
  FileText, FileDown, FileSpreadsheet, UserPlus, Download, UploadCloud,
  Users, History, MapPin, Building2
} from 'lucide-react';
import {
  addTenantCompanyEmployee,
  createTenantCompany,
  deleteTenantCompanyEmployee,
  getTenantCompanies,
  getTenantCompanySectors,
  renewTenantCompany,
  uploadTenantCompanyAgreementDocuments,
  updateTenantCompanyCreditRequest,
  updateTenantCompany,
  updateTenantCompanyEmployee,
  updateTenantCompanyEmployeeStatus,
  updateTenantCompanyManager,
} from '../../../services/tenant-companies';
import { getResources } from '../../../services/resources';
import { getPricingPackages } from '../../../services/pricing-packages';
import { getCountries, getStates, getCities } from '../../../utils/locationApi';
import { toast } from 'sonner';
import { useFreshCurrentUser } from '../../../hooks/useFreshCurrentUser';
import { createReport } from '../../../services/reports';
import { downloadReportFile } from '../../../utils/report-download';
import PageFrame from '../../../components/Pages/PageFrame';

const tenantLocationOptions = [
  { floor: '501', wing: 'A', locationCode: '501A', label: '501 A' },
  { floor: '501', wing: 'B', locationCode: '501B', label: '501 B' },
  { floor: '601', wing: 'A', locationCode: '601A', label: '601 A' },
  { floor: '601', wing: 'B', locationCode: '601B', label: '601 B' },
  { floor: '701', wing: 'A', locationCode: '701A', label: '701 A' },
  { floor: '701', wing: 'B', locationCode: '701B', label: '701 B' },
];

const BULK_TEMPLATE_HEADERS = [
  'Company Name',
  'Contact Name',
  'Business Type',
  'Client Name',
  'Sector',
  'HO Country',
  'HO State',
  'HO City',
  'Building Name',
  'Unit No',
  'Local POC Name',
  'Local POC Email',
  'Local POC Phone',
  'HO POC Name',
  'HO POC Email',
  'HO POC Phone',
  'Email',
  'Phone',
  'Notes',
];

const BULK_COLUMN_ALIASES = {
  companyName: ['company name', 'tenant company', 'tenant', 'company'],
  contactName: ['contact name', 'contact person', 'primary contact', 'poc name'],
  businessType: ['business type', 'industry', 'sector'],
  clientName: ['client name', 'customer name', 'legal name'],
  sector: ['sector', 'customer sector'],
  hoCountry: ['ho country', 'head office country', 'country'],
  hoState: ['ho state', 'head office state'],
  hoCity: ['ho city', 'head office city', 'head office location city'],
  buildingName: ['building name', 'building'],
  unitNo: ['unit no', 'unit number', 'unit', 'office no'],
  localPocName: ['local poc name', 'local contact', 'local point of contact'],
  localPocEmail: ['local poc email', 'local email'],
  localPocPhone: ['local poc phone', 'local phone'],
  hoPocName: ['ho poc name', 'head office poc name', 'ho contact'],
  hoPocEmail: ['ho poc email', 'head office poc email'],
  hoPocPhone: ['ho poc phone', 'head office poc phone'],
  email: ['email', 'contact email'],
  phone: ['phone', 'contact phone', 'mobile'],
  notes: ['notes', 'remarks', 'comments'],
};

function normalizeBulkHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function resolveBulkCellValue(row, aliases = []) {
  const entries = Object.entries(row || {});
  const normalizedEntries = entries.map(([key, value]) => [normalizeBulkHeader(key), value]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeBulkHeader(alias);
    const match = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (match && String(match[1] ?? '').trim()) {
      return match[1];
    }
  }

  return '';
}

function isBulkRowEmpty(row = {}) {
  return !Object.values(row).some((value) => String(value ?? '').trim());
}

async function readSpreadsheetRows(file) {
  const fileName = String(file?.name || '').toLowerCase();
  const isCsv = fileName.endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function buildBulkTenantPayload(row) {
  const companyName = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.companyName)).trim();
  if (!companyName) {
    return { payload: null, error: 'Missing company name.' };
  }

  const localPocName = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.localPocName)).trim();
  const contactName = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.contactName)).trim() || localPocName || companyName;
  const email = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.email)).trim() || String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.localPocEmail)).trim();
  const phone = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.phone)).trim() || String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.localPocPhone)).trim();
  const businessType = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.businessType)).trim();
  const clientName = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.clientName)).trim() || companyName;
  const sector = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.sector)).trim() || businessType;
  const hoCity = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.hoCity)).trim();
  const hoState = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.hoState)).trim();
  const buildingName = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.buildingName)).trim();
  const unitNo = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.unitNo)).trim();
  const notes = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.notes)).trim();

  return {
    payload: {
      draftMode: true,
      companyName,
      contactName,
      email,
      phone,
      businessType,
      planType: 'Pending Setup',
      customerDetails: {
        clientName,
        sector,
        hoCity,
        hoState,
      },
      companyDetails: {
        buildingName,
        unitNo,
        status: 'Active',
      },
      pocDetails: {
        localPocName: localPocName || contactName,
        localPocEmail: String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.localPocEmail)).trim(),
        localPocPhone: String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.localPocPhone)).trim(),
        hoPocName: String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.hoPocName)).trim(),
        hoPocEmail: String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.hoPocEmail)).trim(),
        hoPocPhone: String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.hoPocPhone)).trim(),
      },
      notes,
    },
  };
}

function buildTenantCompanyExportRows(company = {}) {
  const employees = Array.isArray(company.employees) ? company.employees : [];
  const creditHistory = Array.isArray(company.creditHistory) ? company.creditHistory : [];
  const totalCreditsAllocated = Number(company.totalCreditsAllocated ?? company.creditsAllocated ?? 0);
  const creditsUsed = Number(company.creditsUsed ?? 0);

  const rows = [
    { label: 'Company Name', value: company.companyName || '-' },
    { label: 'Company Status', value: company.status || '-' },
    { label: 'Business Type', value: company.businessType || '-' },
    { label: 'Contact Person', value: company.contactName || '-' },
    { label: 'Plan Type', value: company.planType || '-' },
    { label: 'Contract Start', value: company.contractStart || '-' },
    { label: 'Contract End', value: company.contractEnd || '-' },
    { label: 'Base Credits Allocated', value: String(company.baseCreditsAllocated ?? company.creditConfiguration?.monthlyTotalCredits ?? company.packageDetails?.monthlyTotalCredits ?? company.creditsAllocated ?? 0) },
    { label: 'Purchased Credits', value: String(company.purchasedCredits ?? company.addOnCredits?.purchasedCredits ?? 0) },
    { label: 'Total Usable Credits', value: String(totalCreditsAllocated) },
    { label: 'Credits Used', value: String(creditsUsed) },
    { label: 'Credits Remaining', value: String(Math.max(0, totalCreditsAllocated - creditsUsed)) },
    { label: 'Assigned Area', value: company.spaceAssigned?.area || company.space?.floor || 'Unassigned' },
    { label: 'Location Labels', value: Array.isArray(company.spaceAssigned?.locationLabels) && company.spaceAssigned.locationLabels.length > 0 ? company.spaceAssigned.locationLabels.join(', ') : 'N/A' },
    { label: 'Employees', value: String(employees.length) },
    { label: 'Credit History Entries', value: String(creditHistory.length) },
  ];

  employees.slice(0, 25).forEach((employee, index) => {
    rows.push({
      label: `Employee ${index + 1}`,
      value: [
        employee.name || employee.fullName || employee.email || 'Unnamed',
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

function buildTenantCompaniesExportRows(companies = [], filters = {}) {
  const visibleCompanies = Array.isArray(companies) ? companies.slice(0, 150) : [];
  const rows = [
    { label: 'Total Companies', value: String(visibleCompanies.length) },
    { label: 'Active Contracts', value: String(visibleCompanies.filter((company) => company.status === 'Active').length) },
    { label: 'Expiring Soon', value: String(visibleCompanies.filter((company) => company.status === 'Expiring Soon').length) },
    { label: 'Total Credits Issued', value: String(visibleCompanies.reduce((sum, company) => sum + Number(company.creditsAllocated || 0), 0)) },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
    { label: 'Status Filter', value: filters.statusFilter || 'All Status' },
    { label: 'Package Filter', value: filters.packageFilter || 'All Packages' },
  ];

  visibleCompanies.forEach((company, index) => {
    rows.push({
      label: `${index + 1}. ${company.companyName || 'Tenant Company'}`,
      value: [
        company.status ? `Status: ${company.status}` : '',
        company.packageName || company.package ? `Plan: ${company.packageName || company.package}` : '',
        company.contactName ? `Contact: ${company.contactName}` : '',
        company.contractStart || company.contractEnd ? `Contract: ${company.contractStart || '-'} to ${company.contractEnd || '-'}` : '',
        company.creditsAllocated != null ? `Credits: ${company.creditsUsed || 0}/${company.creditsAllocated || 0}` : '',
      ].filter(Boolean).join(' | '),
    });
  });

  if ((companies || []).length > visibleCompanies.length) {
    rows.push({
      label: 'Additional Companies',
      value: `${companies.length - visibleCompanies.length} more companies were omitted to keep the report readable.`,
    });
  }

  return rows;
}

function formatInteger(value = 0) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function formatDateLabel(value = '') {
  if (!value) {
    return '--';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getCreditRequestStatusLabel(status = '') {
  const labels = {
    PENDING_SALES_APPROVAL: 'Pending Sales Approval',
    APPROVED_AWAITING_PAYMENT: 'Approved / Awaiting Payment',
    PAYMENT_SUBMITTED: 'Payment Submitted',
    PAYMENT_CONFIRMED: 'Payment Confirmed',
    INVOICE_GENERATED: 'Invoice Generated',
    CREDITS_ADDED: 'Credits Added',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    PAYMENT_FAILED: 'Payment Failed',
    PAYMENT_REJECTED: 'Payment Rejected',
  };
  return labels[status] || String(status || 'Pending');
}

function getCreditRequestStatusClass(status = '') {
  if (['PAYMENT_CONFIRMED', 'INVOICE_GENERATED', 'CREDITS_ADDED', 'COMPLETED'].includes(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (['APPROVED_AWAITING_PAYMENT', 'PAYMENT_SUBMITTED'].includes(status)) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }
  if (['REJECTED', 'PAYMENT_FAILED', 'PAYMENT_REJECTED'].includes(status)) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function normalizeLocationLabel(value = '') {
  const normalized = String(value || '').trim().toUpperCase().replace(/[\s_-]+/g, ' ');
  if (!normalized) {
    return '';
  }

  const compact = normalized.replace(/\s+/g, '');
  const match = compact.match(/^(\d{3})([AB])$/);
  return match ? `${match[1]} ${match[2]}` : normalized;
}

function normalizeCustomTenantPackageName(value = '') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    return 'custom-package';
  }

  if (normalized === 'custom') {
    return 'custom-package';
  }

  return normalized.startsWith('custom') ? normalized : `custom-${normalized}`;
}

function getTenantArchitectureScope(tenant = {}) {
  const mappings = Array.isArray(tenant.packageDetails?.locationMappings) ? tenant.packageDetails.locationMappings : [];
  const firstMapping = mappings.find((item) => Boolean(item?.floor || item?.wing || item?.label || item?.locationCode)) || null;
  const packageLabels = Array.isArray(tenant.packageLocationLabels) ? tenant.packageLocationLabels : [];
  const normalizedLabel = normalizeLocationLabel(firstMapping?.label || firstMapping?.locationCode || packageLabels[0] || '');
  const labelParts = normalizedLabel.split(' ').filter(Boolean);

  const floor = String(firstMapping?.floor || tenant.space?.floor || labelParts[0] || '').trim();
  const wing = String(firstMapping?.wing || labelParts[labelParts.length - 1] || '').trim().toUpperCase();

  return {
    floor,
    wing,
  };
}

function getLocationMappingKey(mapping = {}) {
  const label = String(mapping?.label || mapping?.locationCode || mapping || '').trim().toUpperCase().replace(/[\s_-]+/g, ' ');
  const compactCode = String(mapping?.locationCode || label).trim().toUpperCase().replace(/[\s_-]+/g, '');
  return `${label}-${compactCode}`;
}

function dedupeLocationMappings(mappings = []) {
  const seen = new Set();

  return (Array.isArray(mappings) ? mappings : []).filter((mapping) => {
    const key = getLocationMappingKey(mapping);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildSalesArchitectureLink(tenant = {}) {
  const { floor, wing } = getTenantArchitectureScope(tenant);
  const tenantId = String(tenant.recordId || tenant.id || '').trim();
  const params = new URLSearchParams();

  if (tenantId) {
    params.set('tenantCompanyId', tenantId);
  }
  if (floor) {
    params.set('floor', floor);
  }
  if (wing) {
    params.set('wing', wing);
  }

  const query = params.toString();
  return `/dashboard/sales-crm/sales-architecture${query ? `?${query}` : ''}`;
}

function normalizeResourceKey(resource = {}) {
  return String(resource.resourceCode || resource.recordId || resource.id || resource.name || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
}

function normalizeResourceLookupKey(value = '') {
  return String(value || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
}

const assignableDeskCategories = new Set(['open_desk', 'cabin_desk']);
const tenantBlockMixOptions = [
  { value: 'all', label: 'All Blocks' },
  { value: 'open', label: 'Open Desk Blocks' },
  { value: 'cabin', label: 'Cabin Desk Blocks' },
];
const TENANT_BILLING_MONTH_DAYS = 30;

function resolveTenantDeskRate(companyValue = 0, packageValue = 0) {
  const companyRate = Math.round(Number(companyValue || 0));
  const packageRate = Math.round(Number(packageValue || 0));

  if (packageRate > 0 && companyRate > 0 && packageRate !== companyRate) {
    return packageRate;
  }

  return companyRate || packageRate || 0;
}

function buildLocationGroupKey(resource = {}) {
  return String(resource.locationLabel || [resource.floor, resource.wing].filter(Boolean).join(' ').trim() || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
}

function getMappedDeskCounts(locationMappings = []) {
  const mappings = Array.isArray(locationMappings) ? locationMappings : [];
  const openDesks = mappings
    .filter((mapping) => {
      const seatType = String(mapping?.seatType || '').trim().toLowerCase();
      return seatType === 'open' || seatType.includes('open');
    })
    .reduce((sum, mapping) => sum + Number(mapping?.seatsAllocated || 0), 0);
  const cabinDesks = mappings
    .filter((mapping) => {
      const seatType = String(mapping?.seatType || '').trim().toLowerCase();
      return seatType === 'cabin' || seatType.includes('cabin');
    })
    .reduce((sum, mapping) => sum + Number(mapping?.seatsAllocated || 0), 0);
  const totalSeats = mappings.reduce((sum, mapping) => sum + Number(mapping?.seatsAllocated || 0), 0);

  return {
    openDesks,
    cabinDesks,
    totalSeats,
  };
}

function isTenantDeskResource(resource = {}) {
  return assignableDeskCategories.has(String(resource.resourceCategory || '').trim().toLowerCase());
}

function isTenantAreaDeskResource(resource = {}) {
  return isTenantDeskResource(resource) && String(resource.inventoryMode || 'area').trim().toLowerCase() === 'area';
}

function isTenantSingleOpenDeskResource(resource = {}) {
  const resourceCategory = String(resource.resourceCategory || '').trim().toLowerCase();
  const inventoryMode = String(resource.inventoryMode || '').trim().toLowerCase();
  const capacity = Number(resource.capacity || 0);

  return resourceCategory === 'open_desk' && (inventoryMode === 'single' || capacity <= 1);
}

function buildTenantResourceMapping(resource = {}) {
  const floor = String(resource.floor || '').trim();
  const wing = String(resource.wing || '').trim().toUpperCase();
  const label = String(resource.locationLabel || [floor, wing].filter(Boolean).join(' ').trim() || resource.name || resource.resourceCode || '').trim();
  const locationCode = String(resource.locationCode || resource.resourceCode || resource.id || label)
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '');
  const seatType = String(resource.resourceCategory || '').trim().toLowerCase().includes('cabin') ? 'cabin' : 'open';

  return {
    floor,
    wing,
    label,
    locationCode,
    resourceCode: String(resource.resourceCode || resource.id || locationCode || '').trim(),
    resourceCategory: String(resource.resourceCategory || '').trim(),
    inventoryMode: String(resource.inventoryMode || 'area').trim(),
    seatType,
    seatsAllocated: Number(resource.capacity || resource.seatsAllocated || 1) || 1,
  };
}

function getTenantResourceSelectionKey(resource = {}) {
  return normalizeResourceLookupKey(resource.resourceCode || resource.locationCode || resource.id || resource.label || '');
}

function buildTenantArchitectureSnapshot(tenant = {}, workspaceResources = []) {
  const tenantId = String(tenant.recordId || tenant.id || '').trim();
  const assignedResources = Array.isArray(workspaceResources)
    ? workspaceResources.filter((resource) => String(resource.assignedTenantCompanyId || '').trim() === tenantId)
    : [];
  const floors = Array.from(new Set(assignedResources.map((resource) => String(resource.floor || '').trim()).filter(Boolean)));
  const wings = Array.from(new Set(assignedResources.map((resource) => String(resource.wing || '').trim()).filter(Boolean)));
  const primaryResource = assignedResources[0] || null;
  const primaryFloor = String(primaryResource?.floor || '').trim();
  const primaryWing = String(primaryResource?.wing || '').trim().toUpperCase();
  const primaryLocation = [primaryFloor, primaryWing].filter(Boolean).join(' ').trim();
  const resourceNames = assignedResources
    .map((resource) => resource.name || resource.resourceCode || resource.id || '')
    .filter(Boolean);
  const areaGroupsMap = assignedResources.reduce((acc, resource) => {
    const label = String(resource.locationLabel || [resource.floor, resource.wing].filter(Boolean).join(' ').trim() || 'Unassigned').trim();
    const key = buildLocationGroupKey(resource) || label.toUpperCase();
    if (!acc[key]) {
      acc[key] = {
        label,
        floor: String(resource.floor || '').trim(),
        wing: String(resource.wing || '').trim().toUpperCase(),
        seats: [],
      };
    }
    acc[key].seats.push(resource);
    return acc;
  }, {});
  const assignedAreaGroups = Object.values(areaGroupsMap).sort((a, b) => {
    const floorCompare = String(a.floor || '').localeCompare(String(b.floor || ''), undefined, { numeric: true });
    if (floorCompare !== 0) return floorCompare;
    return String(a.wing || '').localeCompare(String(b.wing || ''), undefined, { numeric: true });
  });

  return {
    tenantId,
    assignedResources,
    assignedAreaGroups,
    primaryResource,
    primaryFloor,
    primaryWing,
    primaryLocation,
    floors,
    wings,
    resourceNames,
  };
}

function deriveBillingDurationMonths(startDate, endDate, fallbackMonths = 0) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(end);
    normalizedStart.setHours(0, 0, 0, 0);
    normalizedEnd.setHours(0, 0, 0, 0);

    const yearMonthDiff = (normalizedEnd.getFullYear() - normalizedStart.getFullYear()) * 12
      + (normalizedEnd.getMonth() - normalizedStart.getMonth());
    const inclusiveMonths = yearMonthDiff + (normalizedEnd.getDate() >= normalizedStart.getDate() ? 1 : 0);
    return Math.max(1, inclusiveMonths);
  }

  const parsedFallback = Number(fallbackMonths);
  return Number.isFinite(parsedFallback) && parsedFallback > 0 ? parsedFallback : 1;
}

function calculateTenantBillingSummary(form = {}) {
  const companyDetails = form.companyDetails || {};
  const agreementDetails = form.agreementDetails || {};
  const billingDetails = form.billingDetails || {};
  const packageDetails = form.packageDetails || {};
  const startDate = agreementDetails.startDate || form.startDate || '';
  const endDate = agreementDetails.endDate || form.endDate || '';
  const selectedDuration = (() => {
    const lockInMonths = Number(agreementDetails.lockInPeriod);
    if (Number.isFinite(lockInMonths) && lockInMonths > 0) {
      return lockInMonths;
    }

    const duration = String(form.contractDuration || '').trim().toLowerCase();
    if (duration === '3 months') return 3;
    if (duration === '6 months') return 6;
    if (duration === '1 year') return 12;
    if (duration === '2 years') return 24;
    if (duration === 'custom') {
      const parsed = Number(form.customDurationMonths);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    if (Number.isFinite(Number(form.contractDurationMonths)) && Number(form.contractDurationMonths) > 0) {
      return Number(form.contractDurationMonths);
    }
    return 0;
  })();
  const durationMonths = deriveBillingDurationMonths(startDate, endDate, selectedDuration || agreementDetails.lockInPeriod || 0);
  const cabinDesks = Number(companyDetails.cabinDesks || packageDetails.cabinDesks || 0);
  const openDesks = Number(companyDetails.openDesks || packageDetails.openDesks || 0);
  const ratePerCabinDesk = resolveTenantDeskRate(companyDetails.ratePerCabinDesk, packageDetails.ratePerCabinDesk);
  const ratePerOpenDesk = resolveTenantDeskRate(companyDetails.ratePerOpenDesk, packageDetails.ratePerOpenDesk);
  const dailyRent = Math.max(0, (cabinDesks * ratePerCabinDesk) + (openDesks * ratePerOpenDesk));
  const monthlyRent = dailyRent * TENANT_BILLING_MONTH_DAYS;
  const totalContractAmount = monthlyRent * durationMonths;
  const securityDepositAmount = Math.round(totalContractAmount * 0.25);
  const securityDepositPaidStatus = String(billingDetails.securityDepositPaidStatus || 'Pending').toLowerCase() === 'paid' ? 'Paid' : 'Pending';
  const validationErrors = [];

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      validationErrors.push('Start Date must be before End Date.');
    }
  }

  if (!durationMonths || durationMonths < 3) {
    validationErrors.push('Contract duration must be at least 3 months.');
  }

  if ([cabinDesks, openDesks, ratePerCabinDesk, ratePerOpenDesk].some((value) => Number(value) < 0)) {
    validationErrors.push('Desk counts and rates cannot be negative.');
  }

  return {
    durationMonths,
    monthlyRent,
    dailyRent,
    totalContractAmount,
    securityDepositAmount,
    securityDepositPaidStatus,
    validationError: validationErrors[0] || '',
    hasValidationError: validationErrors.length > 0,
  };
}

function formatDateTimeLabel(value) {
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

function getTenantEmployeeStatusMeta(employee = {}) {
  const employmentStatus = String(employee.status || '').toLowerCase();
  const accountStatus = String(employee.accountStatus || employee.inviteStatus || '').toLowerCase();
  if (employmentStatus === 'inactive') return { label: 'Inactive', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (accountStatus.includes('logged in')) return { label: 'Logged In', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (accountStatus.includes('registered')) return { label: 'Registered', className: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (accountStatus.includes('invited')) return { label: 'Invited', className: 'bg-violet-100 text-violet-700 border-violet-200' };
  if (accountStatus.includes('failed')) return { label: 'Invite Failed', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: employee.status || 'Pending Invite', className: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function buildEmployeeName(employee = {}) {
  return String(employee.name || employee.fullName || employee.email || 'Unnamed employee').trim();
}

function getEmployeeInitials(employee = {}) {
  const source = buildEmployeeName(employee);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'E';
}

function normalizeTenantEmployees(employees = [], managerEmployeeId = '') {
  const seen = new Set();
  return (Array.isArray(employees) ? employees : [])
    .map((employee) => ({
      ...employee,
      name: String(employee.name || employee.fullName || '').trim(),
      email: String(employee.email || '').trim().toLowerCase(),
      designation: String(employee.designation || '').trim(),
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

export default function TenantCompaniesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [packageFilter, setPackageFilter] = useState('All Packages');
  const [activeTab, setActiveTab] = useState('companies');
  const [requestStatusFilter, setRequestStatusFilter] = useState('All Requests');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [resources, setResources] = useState([]);
  const currentUser = useFreshCurrentUser();
  const navigate = useNavigate();

  const currentUserName = useMemo(
    () => currentUser?.fullName || currentUser?.name || currentUser?.displayName || 'Sales Manager',
    [currentUser],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadTenantCompanies() {
      let packagesFallback = [];
      try {
        const [tenantResult, resourceResult] = await Promise.allSettled([
          getTenantCompanies(),
          getResources(),
        ]);
        if (!isMounted) return;
        if (tenantResult.status === 'fulfilled') {
          const payload = tenantResult.value?.data || {};
          setTenants(Array.isArray(payload.tenants) ? payload.tenants : []);
          packagesFallback = Array.isArray(payload.packages) ? payload.packages : [];
        } else {
          toast.error(tenantResult.reason?.message || 'Failed to load tenant companies.');
          setTenants([]);
        }

        try {
          const pkgResponse = await getPricingPackages();
          const allPkgs = pkgResponse?.data?.data?.packages || pkgResponse?.data?.packages || [];
          if (isMounted) setAvailablePackages(allPkgs);
        } catch {
          if (isMounted) setAvailablePackages(packagesFallback);
        }

        if (resourceResult.status === 'fulfilled') {
          const resourceBody = resourceResult.value?.data || {};
          const resourcePayload = resourceBody?.data || resourceBody;
          setResources(Array.isArray(resourcePayload.resources) ? resourcePayload.resources : []);
        } else {
          setResources([]);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error.message || 'Failed to load tenant companies.');
          setTenants([]);
          setAvailablePackages([]);
          setResources([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTenantCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  const tenantPackages = useMemo(
    () => availablePackages.filter((item) => item.category === 'Tenant'),
    [availablePackages],
  );

  const tenantAssignablePackages = useMemo(
    () => tenantPackages.filter((item) => item.status === 'Active' && !item.assignedTenantCompanyId),
    [tenantPackages],
  );

  const packageLookup = useMemo(() => {
    return new Map(
      tenantPackages.flatMap((item) => {
        const keys = [
          item._id,
          item.recordId,
          item.id,
          item.packageCode,
        ]
          .map((value) => String(value || '').trim())
          .filter(Boolean);

        return keys.map((key) => [key, item]);
      }),
    );
  }, [tenantPackages]);

  const resourceLookup = useMemo(() => {
    return new Map(
      resources.map((resource) => [
        String(resource.resourceCode || resource.recordId || resource.id || '').trim().toUpperCase().replace(/[\s_-]+/g, ''),
        resource,
      ]),
    );
  }, [resources]);

  const durationLabelFromMonths = (months) => {
    const value = Number(months || 0);
    if (value === 3) return '3 months';
    if (value === 6) return '6 months';
    if (value === 12) return '1 year';
    if (value === 24) return '2 years';
    return 'Custom';
  };

  const resolveDurationMonths = (duration, customMonths) => {
    const normalized = String(duration || '').trim().toLowerCase();
    if (normalized === '3 months') return 3;
    if (normalized === '6 months') return 6;
    if (normalized === '1 year') return 12;
    if (normalized === '2 years') return 24;
    if (normalized === 'custom') return Math.max(3, Number(customMonths || 3) || 3);
    return 12;
  };

  const parseDateForInput = (value) => {
    if (!value) return '';

    if (typeof value === 'string') {
      const compactMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (compactMatch) {
        return value;
      }

      const dateValue = new Date(value);
      if (!Number.isNaN(dateValue.getTime())) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  };

  const addDateOffset = (value, offsetMonths = 0, offsetDays = 0) => {
    const parsed = parseDateForInput(value);
    if (!parsed) return '';

    const [year, month, day] = parsed.split('-').map((part) => Number(part));
    if (![year, month, day].every((part) => Number.isFinite(part))) {
      return '';
    }

    const date = new Date(year, month - 1, day);
    if (offsetMonths) {
      date.setMonth(date.getMonth() + offsetMonths);
    }
    if (offsetDays) {
      date.setDate(date.getDate() + offsetDays);
    }

    return parseDateForInput(date);
  };

  const deriveAnnualIncrementAmount = (companyDetails = {}, packageDetails = {}, durationMonths = 1) => {
    const cabinDesks = toNumber(companyDetails.cabinDesks || packageDetails.cabinDesks || 0);
    const openDesks = toNumber(companyDetails.openDesks || packageDetails.openDesks || 0);
    const ratePerCabinDesk = resolveTenantDeskRate(companyDetails.ratePerCabinDesk, packageDetails.ratePerCabinDesk);
    const ratePerOpenDesk = resolveTenantDeskRate(companyDetails.ratePerOpenDesk, packageDetails.ratePerOpenDesk);
    const monthlyRent = Math.max(0, ((cabinDesks * ratePerCabinDesk) + (openDesks * ratePerOpenDesk)) * TENANT_BILLING_MONTH_DAYS);
    const contractMonths = Math.max(1, toNumber(durationMonths || 1));
    const totalContractAmount = monthlyRent * contractMonths;
    return Math.round(totalContractAmount * 0.1);
  };

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toTextList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim()).filter(Boolean).join('\n');
    }

    return String(value || '');
  };

  const locationLabelsFromValue = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map((item) => String(item?.label || item?.locationCode || item || '').trim())
          .filter(Boolean),
      ),
    );
  };

  const normalizeLocationValue = (value) => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const label = value.trim().toUpperCase().replace(/[\s_-]+/g, ' ');
      const compact = label.replace(/\s+/g, '');
      const match = tenantLocationOptions.find((item) => item.locationCode === compact || item.label === label);
      return match || { label };
    }

    const label = String(value.label || value.locationCode || '').trim().toUpperCase().replace(/[\s_-]+/g, ' ');
    const compact = String(value.locationCode || label).trim().toUpperCase().replace(/[\s_-]+/g, '');
    const match = tenantLocationOptions.find((item) => item.locationCode === compact || item.label === label);
    return match || {
      floor: String(value.floor || '').trim(),
      wing: String(value.wing || '').trim(),
      locationCode: compact,
      label,
      seatType: String(value.seatType || 'mixed').trim(),
      seatsAllocated: toNumber(value.seatsAllocated || 0),
    };
  };

  const normalizeLocationMappings = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return dedupeLocationMappings(value.map((item) => normalizeLocationValue(item)).filter(Boolean));
  };

  const roundToTwoDecimals = (value) => Math.round(Number(value || 0) * 100) / 100;

  const getTenantPackageResourcePricingSummary = (locationMappings = []) => {
    const mappedResources = (Array.isArray(locationMappings) ? locationMappings : [])
      .map((mapping) => {
        const key = normalizeResourceLookupKey(mapping?.locationCode || mapping?.resourceCode || mapping?.id || mapping?.label || '');
        return resourceLookup.get(key) || null;
      })
      .filter(Boolean);

    const averageDailyRate = (items = []) => {
      if (items.length === 0) {
        return 0;
      }

      const total = items.reduce((sum, resource) => sum + Math.max(0, Number(resource.pricePerDay || 0)), 0);
      return Math.round(total / items.length);
    };

    const averageCredits = (items = []) => {
      if (items.length === 0) {
        return 0;
      }
      const total = items.reduce((sum, resource) => sum + Math.max(0, Number(resource.credits || 0)), 0);
      return Math.round(total / items.length);
    };

    return {
      mappedResources,
      ratePerOpenDesk: averageDailyRate(mappedResources.filter((resource) => resource.resourceCategory === 'open_desk')),
      ratePerCabinDesk: averageDailyRate(mappedResources.filter((resource) => resource.resourceCategory === 'cabin_desk')),
      avgCreditsPerSeat: averageCredits(mappedResources),
    };
  };

  const buildTenantPackageDefaults = (selectedPackage = null) => {
    if (!selectedPackage) {
      return {
        companyDetails: {
          unitNo: '',
          cabinDesks: '',
          openDesks: '',
          ratePerCabinDesk: '',
          ratePerOpenDesk: '',
        },
        agreementDetails: {
          annualIncrement: '',
          perDeskMeetingCredits: '',
          totalMeetingCredits: '',
        },
        packageDetails: {
          packageName: '',
          totalSeats: '',
          openDesks: '',
          cabinDesks: '',
          ratePerOpenDesk: '',
          ratePerCabinDesk: '',
          creditsPerSeat: '',
          monthlyTotalCredits: '',
          locationMappings: [],
          selectionFloor: '',
          selectionWing: '',
          selectionBlockMix: 'all',
        },
        creditConfiguration: {
          monthlyTotalCredits: '',
        },
      };
    }

    const normalizedLocationMappings = normalizeLocationMappings(selectedPackage.locationMappings || []);
    const locationLabels = locationLabelsFromValue(normalizedLocationMappings);
    const mappedDeskCounts = getMappedDeskCounts(normalizedLocationMappings);
    const totalSeats = Number(selectedPackage.totalSeats || selectedPackage.seatsIncluded || mappedDeskCounts.totalSeats || 0);
    const openDesks = Number(selectedPackage.openDesks || mappedDeskCounts.openDesks || 0);
    const cabinDesks = Number(selectedPackage.cabinDesks || mappedDeskCounts.cabinDesks || 0);
    const creditsPerSeat = Math.round(Number(selectedPackage.creditsPerSeat || 0));
    const monthlyTotalCredits = Math.round(Number(selectedPackage.monthlyCredits || selectedPackage.creditsIncluded || 0));
    const durationMonths = Number(selectedPackage.durationMonths || 0) || 1;
    const ratePerOpenDesk = Number(selectedPackage.ratePerOpenDesk || 0);
    const ratePerCabinDesk = Number(selectedPackage.ratePerCabinDesk || 0);
    const annualIncrement = deriveAnnualIncrementAmount(
      {
        cabinDesks,
        openDesks,
        ratePerCabinDesk,
        ratePerOpenDesk,
      },
      {},
      durationMonths,
    );

    return {
      companyDetails: {
        unitNo: locationLabels[0] || '',
        cabinDesks: cabinDesks ? String(cabinDesks) : '',
        openDesks: openDesks ? String(openDesks) : '',
        ratePerCabinDesk: ratePerCabinDesk ? String(ratePerCabinDesk) : '',
        ratePerOpenDesk: ratePerOpenDesk ? String(ratePerOpenDesk) : '',
      },
      agreementDetails: {
        annualIncrement: annualIncrement ? String(annualIncrement) : '',
        perDeskMeetingCredits: creditsPerSeat ? String(creditsPerSeat) : '',
        totalMeetingCredits: monthlyTotalCredits ? String(monthlyTotalCredits) : '',
      },
      packageDetails: {
        packageName: selectedPackage.name || '',
        totalSeats: totalSeats ? String(totalSeats) : '',
        openDesks: openDesks ? String(openDesks) : '',
        cabinDesks: cabinDesks ? String(cabinDesks) : '',
        creditsPerSeat: creditsPerSeat ? String(creditsPerSeat) : '',
        monthlyTotalCredits: monthlyTotalCredits ? String(monthlyTotalCredits) : '',
        ratePerCabinDesk: ratePerCabinDesk ? String(ratePerCabinDesk) : '',
        ratePerOpenDesk: ratePerOpenDesk ? String(ratePerOpenDesk) : '',
        locationMappings: normalizedLocationMappings,
        selectionFloor: normalizedLocationMappings[0]?.floor || '',
        selectionWing: normalizedLocationMappings[0]?.wing || '',
        selectionBlockMix: 'all',
      },
      creditConfiguration: {
        monthlyTotalCredits: monthlyTotalCredits ? String(monthlyTotalCredits) : '',
      },
    };
  };

  const toggleLocationMapping = (locationValue) => {
    if (selectedTenantPackage && selectedTenantPackageLocationLabels.length > 0) {
      return;
    }

    setCompanyForm((current) => {
      const currentMappings = Array.isArray(current.packageDetails?.locationMappings)
        ? current.packageDetails.locationMappings
        : [];
      const nextMapping = typeof locationValue === 'object' && locationValue
        ? buildTenantResourceMapping(locationValue)
        : normalizeLocationValue(locationValue);
      const nextKey = getTenantResourceSelectionKey(nextMapping);
      const nextMappings = currentMappings.some((item) => getTenantResourceSelectionKey(item) === nextKey)
        ? currentMappings.filter((item) => getTenantResourceSelectionKey(item) !== nextKey)
        : dedupeLocationMappings([...currentMappings, nextMapping]);
      const mappedDeskCounts = getMappedDeskCounts(nextMappings);
      const pricingSummary = getTenantPackageResourcePricingSummary(nextMappings);
      const nextOpenDeskRate = String(current.companyDetails?.ratePerOpenDesk || '').trim()
        || (pricingSummary.ratePerOpenDesk ? String(pricingSummary.ratePerOpenDesk) : '');
      const nextCabinDeskRate = String(current.companyDetails?.ratePerCabinDesk || '').trim()
        || (pricingSummary.ratePerCabinDesk ? String(pricingSummary.ratePerCabinDesk) : '');
      const nextCreditsPerSeat = String(current.packageDetails?.creditsPerSeat || '').trim()
        || (pricingSummary.avgCreditsPerSeat > 0 ? String(pricingSummary.avgCreditsPerSeat) : '');
      const nextCreditsPerSeatNum = toNumber(nextCreditsPerSeat || 0);
      const nextMonthlyTotal = nextCreditsPerSeatNum > 0 && mappedDeskCounts.totalSeats > 0
        ? String(Math.round(mappedDeskCounts.totalSeats * nextCreditsPerSeatNum))
        : '';

      return {
        ...current,
        companyDetails: {
          ...(current.companyDetails || {}),
          openDesks: mappedDeskCounts.openDesks ? String(mappedDeskCounts.openDesks) : '',
          cabinDesks: mappedDeskCounts.cabinDesks ? String(mappedDeskCounts.cabinDesks) : '',
          ratePerOpenDesk: nextOpenDeskRate,
          ratePerCabinDesk: nextCabinDeskRate,
        },
        packageDetails: {
          ...(current.packageDetails || {}),
          locationMappings: nextMappings,
          totalSeats: mappedDeskCounts.totalSeats ? String(mappedDeskCounts.totalSeats) : '',
          openDesks: mappedDeskCounts.openDesks ? String(mappedDeskCounts.openDesks) : '',
          cabinDesks: mappedDeskCounts.cabinDesks ? String(mappedDeskCounts.cabinDesks) : '',
          ratePerOpenDesk: String(current.packageDetails?.ratePerOpenDesk || '').trim() || nextOpenDeskRate,
          ratePerCabinDesk: String(current.packageDetails?.ratePerCabinDesk || '').trim() || nextCabinDeskRate,
          creditsPerSeat: nextCreditsPerSeat,
          monthlyTotalCredits: nextMonthlyTotal,
        },
        agreementDetails: {
          ...(current.agreementDetails || {}),
          perDeskMeetingCredits: nextCreditsPerSeat || String(current.agreementDetails?.perDeskMeetingCredits || ''),
          totalMeetingCredits: nextMonthlyTotal || String(current.agreementDetails?.totalMeetingCredits || ''),
        },
        creditConfiguration: {
          ...(current.creditConfiguration || {}),
          monthlyTotalCredits: nextMonthlyTotal || String(current.creditConfiguration?.monthlyTotalCredits || ''),
        },
        creditsAllocated: nextMonthlyTotal ? Number(nextMonthlyTotal) : current.creditsAllocated,
      };
    });
  };

  const parseTextList = (value) => String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const calculatePackageMonthlyCredits = (packageDetails = {}) => {
    const totalSeats = toNumber(packageDetails.totalSeats);
    const openDesks = toNumber(packageDetails.openDesks);
    const cabinDesks = toNumber(packageDetails.cabinDesks);
    const creditsPerSeat = toNumber(packageDetails.creditsPerSeat);
    const seatTotal = totalSeats > 0 ? totalSeats : openDesks + cabinDesks;

    if (seatTotal > 0 && creditsPerSeat > 0) {
      return seatTotal * creditsPerSeat;
    }

    return toNumber(packageDetails.monthlyTotalCredits);
  };

  const calculateTotalAllocatedCredits = (form = {}) => {
    return calculatePackageMonthlyCredits(form.packageDetails) + toNumber(form.addOnCredits?.purchasedCredits);
  };

  const calculateRemainingCredits = (form = {}) => {
    return Math.max(0, calculateTotalAllocatedCredits(form) - toNumber(form.creditsUsed));
  };

  const buildDurationFields = (months) => {
    const parsedMonths = Number(months);
    if (!Number.isFinite(parsedMonths) || parsedMonths <= 0) {
      return { contractDuration: '', customDurationMonths: '' };
    }

    const resolvedMonths = Math.max(3, parsedMonths);
    if (resolvedMonths === 3) return { contractDuration: '3 months', customDurationMonths: '' };
    if (resolvedMonths === 6) return { contractDuration: '6 months', customDurationMonths: '' };
    if (resolvedMonths === 12) return { contractDuration: '1 year', customDurationMonths: '' };
    if (resolvedMonths === 24) return { contractDuration: '2 years', customDurationMonths: '' };
    return { contractDuration: 'Custom', customDurationMonths: String(resolvedMonths || '') };
  };

  const initialCompanyForm = {
    companyName: '', contactName: '', email: '', phone: '', businessType: '',
    contractDuration: '', customDurationMonths: '',
    startDate: '', endDate: '', pricingPackageId: '', planType: 'Custom', creditsAllocated: 0,
    customerDetails: { clientName: '', sector: '', hoCountry: '', hoState: '', hoCity: '' },
    companyDetails: {
      buildingName: '', unitNo: '', cabinDesks: '', ratePerCabinDesk: '', openDesks: '', ratePerOpenDesk: '', status: 'Active',
    },
    agreementDetails: {
      annualIncrement: '', perDeskMeetingCredits: '', totalMeetingCredits: '',
      startDate: '', endDate: '', lockInPeriod: '',
    },
    pocDetails: {
      localPocName: '', localPocEmail: '', localPocPhone: '',
      hoPocName: '', hoPocEmail: '', hoPocPhone: '',
    },
    packageDetails: {
      packageName: '', totalSeats: '', openDesks: '', cabinDesks: '',
      ratePerOpenDesk: '', ratePerCabinDesk: '',
      seatTypeVariants: '', creditsPerSeat: '', monthlyTotalCredits: '',
      locationMappings: [],
      selectionFloor: '',
      selectionWing: '',
      selectionBlockMix: 'all',
      creditResetCycle: 'Monthly', creditUsageTracking: '',
    },
    creditConfiguration: {
      monthlyTotalCredits: '', creditResetCycle: 'Monthly', creditUsageTracking: '',
    },
    addOnCredits: { purchasedCredits: '', remainingCredits: '' },
    billingDetails: {
      securityDepositPaidStatus: 'Pending',
    },
    creditsUsed: 0,
    notes: '',
  };
  const [companyForm, setCompanyForm] = useState(initialCompanyForm);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', phone: '', designation: '', role: 'Employee' });
  const [formError, setFormError] = useState('');
  const bulkUploadInputRef = useRef(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [bulkUploadSummary, setBulkUploadSummary] = useState(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState('');

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [agreementFiles, setAgreementFiles] = useState([]);
  const [isAgreementUploading, setIsAgreementUploading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeEditForm, setEmployeeEditForm] = useState({ name: '', phone: '', designation: '', role: 'Employee' });

  const [tenants, setTenants] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [availableSectors, setAvailableSectors] = useState([]);
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

  useEffect(() => {
    if (activeModal === 'add' || activeModal === 'edit') {
      setLoadingCountries(true);
      getCountries()
        .then(setCountries)
        .catch(() => toast.error('Failed to load countries'))
        .finally(() => setLoadingCountries(false));
    }
    if (activeModal !== 'add' && activeModal !== 'edit') {
      setCountries([]);
      setStates([]);
      setCities([]);
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === 'add' || activeModal === 'edit') {
      setShowCustomSector(false);
      getTenantCompanySectors()
        .then((res) => setAvailableSectors(res?.data?.sectors || []))
        .catch(() => { });
    }
  }, [activeModal]);

  useEffect(() => {
    const country = companyForm.customerDetails?.hoCountry;
    if (!country || !(activeModal === 'add' || activeModal === 'edit')) {
      if (!country) { setStates([]); setCities([]); }
      return;
    }
    setLoadingStates(true);
    setCities([]);
    setCompanyForm((prev) => ({ ...prev, customerDetails: { ...prev.customerDetails, hoState: '', hoCity: '' } }));
    getStates(country)
      .then(setStates)
      .catch(() => toast.error('Failed to load states'))
      .finally(() => setLoadingStates(false));
  }, [companyForm.customerDetails?.hoCountry]);

  useEffect(() => {
    const country = companyForm.customerDetails?.hoCountry;
    const state = companyForm.customerDetails?.hoState;
    if (!country || !state || !(activeModal === 'add' || activeModal === 'edit')) { setCities([]); return; }
    setLoadingCities(true);
    getCities(country, state)
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setLoadingCities(false));
  }, [companyForm.customerDetails?.hoState]);

  const syncCustomPackageCreditFields = (currentState, nextCreditsPerSeat, nextTotalSeats = null) => {
    const totalSeats = nextTotalSeats !== null
      ? toNumber(nextTotalSeats)
      : toNumber(currentState.packageDetails?.totalSeats || 0);
    const creditsPerSeat = toNumber(nextCreditsPerSeat || 0);
    const monthlyTotalCredits = totalSeats > 0 && creditsPerSeat > 0
      ? String(Math.round(totalSeats * creditsPerSeat))
      : '';

    return {
      ...currentState,
      packageDetails: {
        ...(currentState.packageDetails || {}),
        creditsPerSeat: nextCreditsPerSeat,
        monthlyTotalCredits,
      },
      agreementDetails: {
        ...(currentState.agreementDetails || {}),
        perDeskMeetingCredits: nextCreditsPerSeat,
        totalMeetingCredits: monthlyTotalCredits,
      },
      creditConfiguration: {
        ...(currentState.creditConfiguration || {}),
        monthlyTotalCredits,
      },
      creditsAllocated: monthlyTotalCredits ? Number(monthlyTotalCredits) : 0,
    };
  };

  const selectedTenantPackage = useMemo(() => {
    if (!companyForm.pricingPackageId || companyForm.pricingPackageId === '__custom__') {
      return null;
    }

    return packageLookup.get(String(companyForm.pricingPackageId)) || null;
  }, [companyForm.pricingPackageId, packageLookup]);

  const isCustomPackageSelected = companyForm.pricingPackageId === '__custom__';
  const isTenantPackageLocked = Boolean(selectedTenantPackage && activeModal !== 'add');

  const tenantPackageSelectionOptions = useMemo(() => {
    const options = [...tenantAssignablePackages];
    if (selectedTenantPackage) {
      const selectedKey = String(selectedTenantPackage.recordId || selectedTenantPackage.id);
      if (!options.some((item) => String(item.recordId || item.id) === selectedKey)) {
        options.unshift(selectedTenantPackage);
      }
    }

    return options;
  }, [selectedTenantPackage, tenantAssignablePackages]);

  const selectedTenantPackageLocationLabels = useMemo(
    () => Array.isArray(selectedTenantPackage?.locationMappings)
      ? selectedTenantPackage.locationMappings
        .map((item) => String(item?.label || item?.locationCode || item || '').trim())
        .filter(Boolean)
      : [],
    [selectedTenantPackage],
  );
  const customPackageFloor = String(companyForm.packageDetails?.selectionFloor || '').trim();
  const customPackageWing = String(companyForm.packageDetails?.selectionWing || '').trim().toUpperCase();
  const customPackageBlockMix = String(companyForm.packageDetails?.selectionBlockMix || 'all').trim().toLowerCase();
  const hasCustomPackageScopeSelection = Boolean(customPackageFloor && customPackageWing);
  const customPackageDeskResources = useMemo(
    () => resources.filter((resource) =>
      isTenantDeskResource(resource)
      && !resource.assignedTenantCompanyId
      && resource.isActive
      && Number(resource.pricePerDay) > 0
      && Number(resource.credits) > 0
    ),
    [resources],
  );
  const customPackageFloorOptions = useMemo(() => {
    const floors = Array.from(new Set(customPackageDeskResources.map((resource) => String(resource.floor || '').trim()).filter(Boolean)));
    return floors.length > 0 ? floors.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : tenantLocationOptions.map((item) => item.floor).filter((value, index, list) => list.indexOf(value) === index);
  }, [customPackageDeskResources]);
  const customPackageWingOptions = useMemo(() => {
    const wings = Array.from(new Set(
      customPackageDeskResources
        .filter((resource) => !customPackageFloor || String(resource.floor || '').trim() === customPackageFloor)
        .map((resource) => String(resource.wing || '').trim().toUpperCase())
        .filter(Boolean),
    ));
    return wings.length > 0 ? wings.sort() : ['A', 'B'];
  }, [customPackageDeskResources, customPackageFloor]);
  const customPackageScopedResources = useMemo(() => {
    if (!hasCustomPackageScopeSelection) {
      return [];
    }

    return customPackageDeskResources.filter((resource) => {
      const matchesFloor = customPackageFloor ? String(resource.floor || '').trim() === customPackageFloor : true;
      const matchesWing = customPackageWing ? String(resource.wing || '').trim().toUpperCase() === customPackageWing : true;
      return matchesFloor && matchesWing;
    });
  }, [customPackageDeskResources, customPackageFloor, customPackageWing, hasCustomPackageScopeSelection]);
  const customPackageAreaResources = useMemo(
    () => customPackageScopedResources.filter((resource) => isTenantAreaDeskResource(resource)),
    [customPackageScopedResources],
  );
  const customPackageSingleOpenDeskResources = useMemo(
    () => customPackageScopedResources.filter((resource) => isTenantSingleOpenDeskResource(resource)),
    [customPackageScopedResources],
  );
  const customPackageOpenAreaResources = useMemo(
    () => customPackageAreaResources.filter((resource) => String(resource.resourceCategory || '').trim().toLowerCase() === 'open_desk'),
    [customPackageAreaResources],
  );
  const customPackageCabinAreaResources = useMemo(
    () => customPackageAreaResources.filter((resource) => String(resource.resourceCategory || '').trim().toLowerCase() === 'cabin_desk'),
    [customPackageAreaResources],
  );
  const customPackageVisibleOpenAreaResources = useMemo(
    () => customPackageOpenAreaResources,
    [customPackageOpenAreaResources],
  );
  const customPackageVisibleCabinAreaResources = useMemo(
    () => customPackageCabinAreaResources,
    [customPackageCabinAreaResources],
  );
  const customPackageVisibleSingleOpenDeskResources = useMemo(
    () => customPackageSingleOpenDeskResources,
    [customPackageSingleOpenDeskResources],
  );
  const customPackageSelectedResourceKeys = useMemo(
    () => new Set(
      Array.isArray(companyForm.packageDetails?.locationMappings)
        ? companyForm.packageDetails.locationMappings.map((mapping) => getTenantResourceSelectionKey(mapping)).filter(Boolean)
        : [],
    ),
    [companyForm.packageDetails?.locationMappings],
  );
  const customPackageOpenSelectedCount = useMemo(
    () => customPackageOpenAreaResources.filter((resource) => customPackageSelectedResourceKeys.has(getTenantResourceSelectionKey(resource))).length,
    [customPackageOpenAreaResources, customPackageSelectedResourceKeys],
  );
  const customPackageCabinSelectedCount = useMemo(
    () => customPackageCabinAreaResources.filter((resource) => customPackageSelectedResourceKeys.has(getTenantResourceSelectionKey(resource))).length,
    [customPackageCabinAreaResources, customPackageSelectedResourceKeys],
  );
  const selectedTenantArchitectureLink = useMemo(
    () => (selectedTenant ? buildSalesArchitectureLink(selectedTenant) : ''),
    [selectedTenant],
  );
  const selectedTenantArchitectureSnapshot = useMemo(
    () => (selectedTenant ? buildTenantArchitectureSnapshot(selectedTenant, resources) : {
      tenantId: '',
      assignedResources: [],
      primaryResource: null,
      primaryFloor: '',
      primaryWing: '',
      primaryLocation: '',
      floors: [],
      wings: [],
      resourceNames: [],
      assignedAreaGroups: [],
    }),
    [selectedTenant, resources],
  );
  const selectedTenantView = useMemo(() => {
    if (!selectedTenant) {
      return null;
    }

    if (activeModal !== 'view') {
      return selectedTenant;
    }

    return {
      ...selectedTenant,
      ...companyForm,
      companyDetails: {
        ...(selectedTenant.companyDetails || {}),
        ...(companyForm.companyDetails || {}),
      },
      agreementDetails: {
        ...(selectedTenant.agreementDetails || {}),
        ...(companyForm.agreementDetails || {}),
      },
      packageDetails: {
        ...(selectedTenant.packageDetails || {}),
        ...(companyForm.packageDetails || {}),
      },
      billingDetails: {
        ...(selectedTenant.billingDetails || {}),
        ...(companyForm.billingDetails || {}),
      },
      spaceAssigned: {
        ...(selectedTenant.spaceAssigned || {}),
        ...(companyForm.packageDetails?.totalSeats ? { totalSeats: Number(companyForm.packageDetails.totalSeats || 0) } : {}),
        ...(companyForm.packageDetails?.openDesks ? { openDesks: Number(companyForm.packageDetails.openDesks || 0) } : {}),
        ...(companyForm.packageDetails?.cabinDesks ? { cabinDesks: Number(companyForm.packageDetails.cabinDesks || 0) } : {}),
        ...(Array.isArray(selectedTenant.spaceAssigned?.assignedSeats) && selectedTenant.spaceAssigned.assignedSeats.length > 0
          ? { assignedSeats: selectedTenant.spaceAssigned.assignedSeats }
          : {}),
      },
      space: {
        ...(selectedTenant.space || {}),
        seats: Array.isArray(selectedTenant.space?.seats) && selectedTenant.space.seats.length > 0
          ? selectedTenant.space.seats
          : Array.isArray(selectedTenant.spaceAssigned?.assignedSeats)
            ? selectedTenant.spaceAssigned.assignedSeats
            : [],
      },
    };
  }, [activeModal, companyForm, selectedTenant]);
  const selectedTenantSeatLabels = useMemo(() => {
    const tenantForDisplay = selectedTenantView || selectedTenant;
    const collectSeatLabels = (items = []) => {
      if (!Array.isArray(items)) {
        return [];
      }

      return items
        .map((seat) => {
          if (typeof seat === 'string') {
            return seat.trim();
          }

          return String(seat?.name || seat?.resourceCode || seat?.id || seat?.label || '').trim();
        })
        .filter(Boolean);
    };

    const candidateSeatLists = [
      collectSeatLabels(tenantForDisplay?.spaceAssigned?.assignedSeats || []),
      collectSeatLabels(tenantForDisplay?.space?.seats || []),
      collectSeatLabels(selectedTenantArchitectureSnapshot.assignedResources || []),
    ].filter((items) => items.length > 0);

    if (candidateSeatLists.length === 0) {
      return [];
    }

    return candidateSeatLists
      .sort((a, b) => b.length - a.length)[0]
      .filter((seat, index, list) => list.indexOf(seat) === index);
  }, [selectedTenantView, selectedTenant, selectedTenantArchitectureSnapshot]);
  const selectedTenantBillingDisplay = useMemo(() => {
    const tenantForDisplay = selectedTenantView || selectedTenant;

    if (!tenantForDisplay) {
      return {
        openDeskCount: 0,
        cabinDeskCount: 0,
        totalSeats: 0,
        ratePerOpenDesk: 0,
        ratePerCabinDesk: 0,
        monthlyRent: 0,
        totalContractAmount: 0,
        securityDepositAmount: 0,
        annualIncrement: 0,
        durationMonths: 0,
      };
    }

    const packageDetails = tenantForDisplay.packageDetails || {};
    const companyDetails = tenantForDisplay.companyDetails || {};
    const spaceAssigned = tenantForDisplay.spaceAssigned || {};
    const packageDeskCounts = getMappedDeskCounts(packageDetails.locationMappings || []);
    const openDeskCount = toNumber(
      companyDetails.openDesks
      || spaceAssigned.openDesks
      || packageDetails.openDesks
      || packageDeskCounts.openDesks
      || 0,
    );
    const cabinDeskCount = toNumber(
      companyDetails.cabinDesks
      || spaceAssigned.cabinDesks
      || packageDetails.cabinDesks
      || packageDeskCounts.cabinDesks
      || 0,
    );
    const totalSeats = toNumber(
      spaceAssigned.totalSeats
      || selectedTenantSeatLabels.length
      || (toNumber(companyDetails.openDesks || 0) + toNumber(companyDetails.cabinDesks || 0))
      || packageDetails.totalSeats
      || packageDeskCounts.totalSeats
      || openDeskCount + cabinDeskCount
      || 0,
    );
    const ratePerOpenDesk = resolveTenantDeskRate(companyDetails.ratePerOpenDesk, packageDetails.ratePerOpenDesk);
    const ratePerCabinDesk = resolveTenantDeskRate(companyDetails.ratePerCabinDesk, packageDetails.ratePerCabinDesk);
    const dailyRent = Math.max(0, (openDeskCount * ratePerOpenDesk) + (cabinDeskCount * ratePerCabinDesk));
    const monthlyRent = dailyRent * TENANT_BILLING_MONTH_DAYS;
    const durationMonths = Math.max(1, toNumber(
      tenantForDisplay.billingDetails?.contractDurationMonths
      || tenantForDisplay.contractDurationMonths
      || tenantForDisplay.agreementDetails?.lockInPeriod
      || tenantForDisplay.packageDurationMonths
      || 1,
    ));
    const totalContractAmount = monthlyRent * durationMonths;
    const securityDepositAmount = Math.round(totalContractAmount * 0.25);
    const annualIncrement = toNumber(
      tenantForDisplay.agreementDetails?.annualIncrement
      || Math.round((monthlyRent * durationMonths) * 0.1),
    );

    const creditsAllocated = toNumber(
      tenantForDisplay.packageDetails?.monthlyTotalCredits || tenantForDisplay.creditsAllocated || tenantForDisplay.creditsTotal || 0,
    );
    const purchasedCredits = toNumber(tenantForDisplay.addOnCredits?.purchasedCredits || 0);
    const creditsUsed = toNumber(tenantForDisplay.creditsUsed || 0);
    const creditsRemaining = Math.max(0, creditsAllocated + purchasedCredits - creditsUsed);

    return {
      openDeskCount,
      cabinDeskCount,
      totalSeats,
      ratePerOpenDesk,
      ratePerCabinDesk,
      monthlyRent,
      totalContractAmount,
      securityDepositAmount,
      annualIncrement,
      durationMonths,
      credits: creditsAllocated,
      purchasedCredits,
      creditsUsed,
      creditsRemaining,
    };
  }, [selectedTenantView, selectedTenant, selectedTenantSeatLabels]);
  const billingSummary = useMemo(
    () => calculateTenantBillingSummary(companyForm),
    [companyForm],
  );

  const tenantAgreementDocuments = Array.isArray(selectedTenant?.agreementDocuments) ? selectedTenant.agreementDocuments : [];
  const hasExistingAgreementDocuments = tenantAgreementDocuments.length > 0;
  const canSaveTenantCompany = activeModal === 'add' || activeModal === 'renew' || hasExistingAgreementDocuments || agreementFiles.length > 0;
  const contractDurationMonthsValue = Number(companyForm.agreementDetails?.lockInPeriod);
  const isContractDurationInvalid = !Number.isFinite(contractDurationMonthsValue) || contractDurationMonthsValue < 3;

  const displayedTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = t.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || t.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || t.status === statusFilter;
      const matchesPackage = packageFilter === 'All Packages' || t.packageName === packageFilter || t.package === packageFilter;
      return matchesSearch && matchesStatus && matchesPackage;
    });
  }, [tenants, searchQuery, statusFilter, packageFilter]);

  const handleExportCompaniesReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    if (displayedTenants.length === 0) {
      toast.error('There are no tenant companies to export.');
      return;
    }

    setIsExportingReport(reportFormat);

    try {
      const response = await createReport({
        title: 'Sales Tenant Companies',
        department: 'Sales & CRM',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: 'Tenant Companies',
        generatedBy: currentUserName,
        format: reportFormat,
        description: 'Sales tenant companies listing and contract summary.',
        sourceType: 'department-roster',
        sourceRef: 'sales-tenant-companies',
        reportRows: buildTenantCompaniesExportRows(displayedTenants, {
          searchQuery,
          statusFilter,
          packageFilter,
        }),
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }

      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Tenant companies report saved to Reports.' : 'Tenant companies report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : '/dashboard/sales-crm/report');
    } catch (error) {
      toast.error(error?.message || 'Unable to export tenant companies report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const handleExportCompanyReport = async (company, format = 'PDF') => {
    if (!company) return;

    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    setIsExportingReport(reportFormat);

    try {
      const response = await createReport({
        title: `${company.companyName || 'Tenant Company'} Profile`,
        department: 'Sales & CRM',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: 'Tenant Company Profile',
        generatedBy: currentUserName,
        format: reportFormat,
        description: `${company.companyName || 'Tenant Company'} profile, contract and employee summary.`,
        sourceType: 'custom',
        sourceRef: String(company.recordId || company.id || company.companyName || '').trim(),
        reportRows: buildTenantCompanyExportRows(company),
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }

      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Company report saved to Reports.' : 'Company report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : '/dashboard/sales-crm/report');
    } catch (error) {
      toast.error(error?.message || 'Unable to export company report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const creditRequests = useMemo(() => {
    return tenants.flatMap((tenant) => {
      const tenantRequests = Array.isArray(tenant.creditRequests) ? tenant.creditRequests : [];
      return tenantRequests.map((request) => ({
        ...request,
        tenantCompanyId: tenant.recordId || tenant.id,
        tenantCompanyName: tenant.companyName,
        tenantCompanyCode: tenant.id,
        currentCredits: tenant.creditsRemaining,
      }));
    });
  }, [tenants]);

  const displayedCreditRequests = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return creditRequests.filter((request) => {
      const matchesSearch = !normalizedSearch
        || String(request.tenantCompanyName || '').toLowerCase().includes(normalizedSearch)
        || String(request.requestedByName || '').toLowerCase().includes(normalizedSearch)
        || String(request.requestedReason || '').toLowerCase().includes(normalizedSearch)
        || String(request.invoiceNumber || '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = requestStatusFilter === 'All Requests' || request.status === requestStatusFilter;

      return matchesSearch && matchesStatus;
    }).sort((left, right) => {
      const leftDate = new Date(left.requestedAtAt || left.requestedAt || 0).getTime();
      const rightDate = new Date(right.requestedAtAt || right.requestedAt || 0).getTime();
      return rightDate - leftDate;
    });
  }, [creditRequests, requestStatusFilter, searchQuery]);

  const creditRequestSummary = useMemo(() => {
    return creditRequests.reduce((accumulator, request) => {
      const status = String(request.status || 'PENDING_SALES_APPROVAL');
      accumulator.total += 1;
      accumulator.requestedCredits += Number(request.requestedCredits || 0);
      if (status === 'PENDING_SALES_APPROVAL') accumulator.pending += 1;
      if (status === 'APPROVED_AWAITING_PAYMENT') accumulator.salesApproved += 1;
      if (['PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'INVOICE_GENERATED'].includes(status)) accumulator.sentToFinance += 1;
      if (['PAYMENT_CONFIRMED', 'INVOICE_GENERATED', 'CREDITS_ADDED', 'COMPLETED'].includes(status)) accumulator.paid += 1;
      if (['REJECTED', 'PAYMENT_FAILED', 'PAYMENT_REJECTED'].includes(status)) accumulator.rejected += 1;
      return accumulator;
    }, {
      total: 0,
      pending: 0,
      salesApproved: 0,
      sentToFinance: 0,
      paid: 0,
      rejected: 0,
      requestedCredits: 0,
    });
  }, [creditRequests]);

  const summaryCards = useMemo(() => {
    if (activeTab === 'requests') {
      return [
        {
          key: 'total-requests',
          icon: FileText,
          value: formatInteger(creditRequestSummary.total),
          label: 'Total Requests',
          tone: 'blue',
          cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md',
          iconClass: 'bg-blue-50 text-blue-600',
        },
        {
          key: 'pending-requests',
          icon: Clock,
          value: formatInteger(creditRequestSummary.pending),
          label: 'Pending',
          tone: 'amber',
          cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500',
          iconClass: 'bg-amber-50 text-amber-600',
        },
        {
          key: 'sent-to-finance',
          icon: ArrowRight,
          value: formatInteger(creditRequestSummary.sentToFinance),
          label: 'Sent to Finance',
          tone: 'blue',
          cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500',
          iconClass: 'bg-blue-50 text-blue-600',
        },
        {
          key: 'paid-requests',
          icon: CheckCircle2,
          value: formatInteger(creditRequestSummary.paid),
          label: 'Paid',
          tone: 'emerald',
          cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500',
          iconClass: 'bg-emerald-50 text-emerald-600',
        },
      ];
    }

    return [
      {
        key: 'total-tenants',
        icon: Building,
        value: formatInteger(tenants.length),
        label: 'Total Tenants',
        tone: 'blue',
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md',
        iconClass: 'bg-blue-50 text-blue-600',
      },
      {
        key: 'active-contracts',
        icon: CheckCircle2,
        value: formatInteger(tenants.filter((tenant) => tenant.status === 'Active').length),
        label: 'Active Contracts',
        tone: 'green',
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-green-500',
        iconClass: 'bg-green-50 text-green-600',
      },
      {
        key: 'expiring-contracts',
        icon: AlertTriangle,
        value: formatInteger(tenants.filter((tenant) => tenant.status === 'Expiring Soon').length),
        label: 'Expiring Soon (30d)',
        tone: 'amber',
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500',
        iconClass: 'bg-amber-50 text-amber-600',
      },
      {
        key: 'expired-contracts',
        icon: XCircle,
        value: formatInteger(tenants.filter((tenant) => tenant.status === 'Expired').length),
        label: 'Expired Contracts',
        tone: 'red',
        cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500',
        iconClass: 'bg-red-50 text-red-600',
      },
    ];
  }, [activeTab, creditRequestSummary, tenants]);

  const handleCreditRequestAction = async (request, nextStatus) => {
    try {
      const tenantCompanyId = request.tenantCompanyId;
      const requestId = request.id || request._id;
      if (!tenantCompanyId || !requestId) {
        toast.error('Missing credit request details.');
        return;
      }

      const approvedCredits = nextStatus === 'REJECTED'
        ? 0
        : Number(request.approvedCredits || request.requestedCredits || 0);
      const salesNote = nextStatus === 'REJECTED'
        ? 'Rejected by Sales.'
        : nextStatus === 'COMPLETED'
          ? 'Credits allocated by Sales.'
          : nextStatus === 'PAYMENT_CONFIRMED'
            ? 'Payment verified by Sales.'
            : 'Approved by Sales.';
      const financeNote = nextStatus === 'PAYMENT_CONFIRMED' ? 'Payment verified successfully.' : undefined;

      const response = await updateTenantCompanyCreditRequest(tenantCompanyId, requestId, {
        status: nextStatus,
        approvedCredits,
        salesNote,
        financeNote,
      });

      const payload = response?.data || {};
      const updatedRequest = payload.creditRequest;
      if (payload.tenant) {
        setTenants((current) => current.map((tenant) => {
          const currentTenantId = tenant.recordId || tenant.id;
          const updatedTenantId = payload.tenant.recordId || payload.tenant.id;
          return currentTenantId === updatedTenantId ? payload.tenant : tenant;
        }));
      } else if (updatedRequest) {
        setTenants((current) => current.map((tenant) => {
          const currentTenantId = String(tenant.recordId || tenant.id || '');
          if (currentTenantId !== String(tenantCompanyId)) {
            return tenant;
          }

          const nextRequests = Array.isArray(tenant.creditRequests)
            ? tenant.creditRequests.map((item) => {
              const itemRequestId = item.id || item._id;
              return String(itemRequestId) === String(requestId) ? { ...item, ...updatedRequest } : item;
            })
            : [];

          return { ...tenant, creditRequests: nextRequests };
        }));
      }

      toast.success(nextStatus === 'REJECTED' ? 'Request rejected.' : nextStatus === 'PAYMENT_CONFIRMED' ? 'Payment verified.' : 'Request updated.');
    } catch (error) {
      toast.error(error.message || 'Failed to update credit request.');
    }
  };

  useEffect(() => {
    const startValue = companyForm.agreementDetails.startDate || companyForm.startDate;
    if (!startValue) {
      return;
    }

    const startDate = parseDateForInput(startValue);
    if (!startDate) {
      return;
    }

    const monthsToAdd = Math.max(3, toNumber(
      companyForm.agreementDetails?.lockInPeriod
      || resolveDurationMonths(companyForm.contractDuration, companyForm.customDurationMonths)
      || 3,
    ));
    const endDate = addDateOffset(startDate, monthsToAdd, -1);
    const annualIncrement = billingSummary.monthlyRent > 0 ? String(Math.round(billingSummary.monthlyRent * 0.1)) : '';

    setCompanyForm((prev) => ({
      ...prev,
      startDate: startDate,
      endDate,
      agreementDetails: {
        ...(prev.agreementDetails || {}),
        startDate: startDate,
        endDate,
        annualIncrement,
      },
    }));
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    billingSummary.monthlyRent,
    companyForm.agreementDetails.startDate,
    companyForm.startDate,
    companyForm.contractDuration,
    companyForm.customDurationMonths,
  ]);

  useEffect(() => {
    if (!companyForm.pricingPackageId) {
      return;
    }

    const selectedPackage = packageLookup.get(String(companyForm.pricingPackageId));
    if (!selectedPackage) {
      return;
    }

    setCompanyForm((prev) => ({
      ...prev,
      planType: selectedPackage.name,
      contractDuration: durationLabelFromMonths(selectedPackage.durationMonths),
      creditsAllocated: Number(selectedPackage.creditsIncluded || 0),
      customDurationMonths: '',
      companyDetails: {
        ...(prev.companyDetails || {}),
        ...buildTenantPackageDefaults(selectedPackage).companyDetails,
      },
      agreementDetails: {
        ...(prev.agreementDetails || {}),
        ...buildTenantPackageDefaults(selectedPackage).agreementDetails,
      },
      packageDetails: {
        ...(prev.packageDetails || {}),
        ...buildTenantPackageDefaults(selectedPackage).packageDetails,
      },
      creditConfiguration: {
        ...(prev.creditConfiguration || {}),
        ...buildTenantPackageDefaults(selectedPackage).creditConfiguration,
      },
    }));
  }, [companyForm.pricingPackageId, packageLookup]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCompanySection = (section, field, value) => {
    setCompanyForm((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveCompany = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setFormError('');

    if (activeModal !== 'renew' && activeModal !== 'add' && !hasExistingAgreementDocuments && agreementFiles.length === 0) {
      toast.error('At least one agreement document is required.');
      return;
    }

    if (billingSummary.hasValidationError) {
      setFormError(billingSummary.validationError);
      toast.error(billingSummary.validationError);
      return;
    }

    setIsSaving(true);
    try {
      const agreementMonths = Math.max(3, toNumber(
        companyForm.agreementDetails?.lockInPeriod
        || resolveDurationMonths(companyForm.contractDuration, companyForm.customDurationMonths)
        || 3,
      ));
      const submissionForm = activeModal === 'renew'
        ? companyForm
        : {
          ...companyForm,
          ...buildDurationFields(agreementMonths),
          startDate: companyForm.agreementDetails?.startDate || companyForm.startDate,
          endDate: companyForm.agreementDetails?.endDate || companyForm.endDate,
          businessType: companyForm.businessType || companyForm.customerDetails?.sector || '',
          contractStart: companyForm.agreementDetails?.startDate || companyForm.startDate || null,
          contractDurationMonths: agreementMonths,
        };
      if (activeModal === 'add' && submissionForm?.pricingPackageId === '__custom__') {
        submissionForm.packageDetails = {
          ...(submissionForm.packageDetails || {}),
          packageName: normalizeCustomTenantPackageName(
            submissionForm.packageDetails?.packageName || submissionForm.companyName || '',
          ),
        };
      }
      if (submissionForm.packageDetails) {
        delete submissionForm.packageDetails.seatTypeVariants;
        delete submissionForm.packageDetails.selectionFloor;
        delete submissionForm.packageDetails.selectionWing;
        delete submissionForm.packageDetails.selectionBlockMix;
      }
      let response = null;

      if (activeModal === 'add') {
        response = await createTenantCompany(submissionForm);
      } else if (activeModal === 'edit' && selectedTenant) {
        response = await updateTenantCompany(selectedTenant.recordId || selectedTenant.id, submissionForm);
      } else if (activeModal === 'renew' && selectedTenant) {
        response = await renewTenantCompany(selectedTenant.recordId || selectedTenant.id, submissionForm);
      }

      const payload = response?.data || {};
      const savedTenantId = payload?.tenant?.recordId || payload?.tenant?.id || selectedTenant?.recordId || selectedTenant?.id || '';
      syncTenantCollections(payload, savedTenantId);

      if (activeModal !== 'renew' && agreementFiles.length > 0 && savedTenantId) {
        try {
          const uploadResponse = await uploadTenantCompanyAgreementDocuments(savedTenantId, agreementFiles);
          syncTenantCollections(uploadResponse?.data || {}, savedTenantId);
        } catch (uploadError) {
          toast.error(uploadError.message || 'Tenant saved, but agreement documents could not be uploaded.');
        }
      }

      toast.success(
        activeModal === 'add'
          ? 'Tenant company added successfully.'
          : activeModal === 'renew'
            ? 'Contract renewed successfully.'
            : 'Tenant company updated successfully.',
      );
      setActiveModal(null);
      setSelectedTenant(null);
      setCompanyForm(initialCompanyForm);
      setAgreementFiles([]);
      setFormError('');
    } catch (error) {
      toast.error(error.message || 'Unable to save tenant company.');
      setFormError(error.message || 'Unable to save tenant company.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmployee = async (event) => {
    event.preventDefault();
    if (!selectedTenant || isSaving) return;

    setIsSaving(true);
    try {
      const response = await addTenantCompanyEmployee(selectedTenant.recordId || selectedTenant.id, employeeForm);
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) {
        setTenants(payload.tenants);
        if (Array.isArray(payload.packages)) {
          setAvailablePackages(payload.packages);
        }
      } else if (payload.tenant) {
        setTenants((current) => current.map((tenant) => ((tenant.recordId || tenant.id) === (payload.tenant.recordId || payload.tenant.id) ? payload.tenant : tenant)));
      }
      toast.success('Employee added successfully.');
      setEmployeeModalOpen(false);
      setActiveModal('view');
      setEmployeeForm({ name: '', email: '', phone: '', designation: '' });
    } catch (error) {
      toast.error(error.message || 'Unable to add employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadBulkTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const tenantCompaniesSheet = XLSX.utils.aoa_to_sheet([
      BULK_TEMPLATE_HEADERS,
      Array(BULK_TEMPLATE_HEADERS.length).fill(''),
    ]);

    const requiredFieldsSheet = XLSX.utils.json_to_sheet([
      { Field: 'Company Name', Requirement: 'Required', Notes: 'Tenant company display name.' },
      { Field: 'Contact Name', Requirement: 'Optional', Notes: 'Primary contact; falls back to local POC or company name.' },
      { Field: 'Business Type', Requirement: 'Optional', Notes: 'Industry or business sector.' },
      { Field: 'Client Name', Requirement: 'Optional', Notes: 'Customer-facing company label.' },
      { Field: 'Sector', Requirement: 'Optional', Notes: 'Customer sector / vertical.' },
      { Field: 'HO Country', Requirement: 'Optional', Notes: 'Head office country.' },
      { Field: 'HO State', Requirement: 'Optional', Notes: 'Head office state.' },
      { Field: 'HO City', Requirement: 'Optional', Notes: 'Head office city.' },
      { Field: 'Building Name', Requirement: 'Optional', Notes: 'Use Sunteck Kanaka for this template. Editable later in the manager screen.' },
      { Field: 'Unit No', Requirement: 'Optional', Notes: 'Use floors 701, 601, or 501 with A or B understood, for example 701 A or 601 B.' },
      { Field: 'Local POC Name', Requirement: 'Optional', Notes: 'Local point of contact name.' },
      { Field: 'Local POC Email', Requirement: 'Optional', Notes: 'Local point of contact email.' },
      { Field: 'Local POC Phone', Requirement: 'Optional', Notes: 'Local point of contact phone.' },
      { Field: 'HO POC Name', Requirement: 'Optional', Notes: 'Head office point of contact name.' },
      { Field: 'HO POC Email', Requirement: 'Optional', Notes: 'Head office point of contact email.' },
      { Field: 'HO POC Phone', Requirement: 'Optional', Notes: 'Head office point of contact phone.' },
      { Field: 'Email', Requirement: 'Optional', Notes: 'General company email.' },
      { Field: 'Phone', Requirement: 'Optional', Notes: 'General company phone.' },
      { Field: 'Notes', Requirement: 'Optional', Notes: 'Free-text remarks.' },
    ], { header: ['Field', 'Requirement', 'Notes'] });

    const formatGuideSheet = XLSX.utils.json_to_sheet([
      { Field: 'Company Name', Format: 'Text', Example: 'TechTrove Innovations', Notes: 'Use the tenant company name.' },
      { Field: 'Contact Name', Format: 'Text', Example: 'Ram Thakur', Notes: 'Optional if local POC is provided.' },
      { Field: 'Business Type', Format: 'Text', Example: 'Tech', Notes: 'Optional.' },
      { Field: 'Client Name', Format: 'Text', Example: 'TechTrove Innovations', Notes: 'Optional.' },
      { Field: 'Sector', Format: 'Text', Example: 'Technology', Notes: 'Optional.' },
      { Field: 'HO Country', Format: 'Text', Example: 'India', Notes: 'Optional.' },
      { Field: 'HO State', Format: 'Text', Example: 'Maharashtra', Notes: 'Optional.' },
      { Field: 'HO City', Format: 'Text', Example: 'Mumbai', Notes: 'Optional.' },
      { Field: 'Building Name', Format: 'Text', Example: 'Sunteck Kanaka', Notes: 'Use this building name for the template.' },
      { Field: 'Unit No', Format: 'Text', Example: '701 A', Notes: 'Use 701, 601, or 501 with A or B understood.' },
      { Field: 'Local POC Name', Format: 'Text', Example: '[sample person name]', Notes: 'Optional.' },
      { Field: 'Local POC Email', Format: 'Text', Example: '[sample email]', Notes: 'Optional.' },
      { Field: 'Local POC Phone', Format: 'Text', Example: '[sample phone]', Notes: 'Optional.' },
      { Field: 'HO POC Name', Format: 'Text', Example: '[sample person name]', Notes: 'Optional.' },
      { Field: 'HO POC Email', Format: 'Text', Example: '[sample email]', Notes: 'Optional.' },
      { Field: 'HO POC Phone', Format: 'Text', Example: '[sample phone]', Notes: 'Optional.' },
      { Field: 'Email', Format: 'Text', Example: '[sample company email]', Notes: 'Optional.' },
      { Field: 'Phone', Format: 'Text', Example: '[sample company phone]', Notes: 'Optional.' },
      { Field: 'Notes', Format: 'Text', Example: 'Priority tenant / special access', Notes: 'Optional free-text notes.' },
    ], { header: ['Field', 'Format', 'Example', 'Notes'] });

    const workflowGuideSheet = XLSX.utils.json_to_sheet([
      { Label: 'Draft tenant company onboarding', Notes: 'Building name is Sunteck Kanaka. Use unit numbers like 701 A, 601 B, or 501 A; A/B is understood.' },
    ], { header: ['Label', 'Notes'] });

    XLSX.utils.book_append_sheet(workbook, tenantCompaniesSheet, 'Tenant Companies');
    XLSX.utils.book_append_sheet(workbook, requiredFieldsSheet, 'Required Fields');
    XLSX.utils.book_append_sheet(workbook, formatGuideSheet, 'Format Guide');
    XLSX.utils.book_append_sheet(workbook, workflowGuideSheet, 'Workflow Guide');
    XLSX.writeFile(workbook, 'tenant-companies-bulk-template.xlsx');
  };

  const handleBulkUploadClick = () => {
    setBulkUploadError('');
    setBulkUploadSummary(null);
    setBulkUploadFileName('');
    setIsBulkUploadOpen(true);
    if (bulkUploadInputRef.current) {
      bulkUploadInputRef.current.value = '';
    }
  };

  const handleBulkFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkUploadError('');
    setBulkUploadSummary(null);
    setBulkUploadFileName(file.name);
    setIsBulkImporting(true);

    try {
      const rows = await readSpreadsheetRows(file);
      const nonEmptyRows = rows.filter((row) => !isBulkRowEmpty(row));

      if (nonEmptyRows.length === 0) {
        throw new Error('No tenant rows found in the file.');
      }

      let created = 0;
      const failedRows = [];

      for (const [index, row] of nonEmptyRows.entries()) {
        const built = buildBulkTenantPayload(row);
        if (!built.payload) {
          failedRows.push(`Row ${index + 2}: ${built.error}`);
          continue;
        }

        try {
          const response = await createTenantCompany(built.payload);
          const payload = response?.data || {};
          const savedTenantId = payload?.tenant?.recordId || payload?.tenant?.id || '';
          syncTenantCollections(payload, savedTenantId);
          created += 1;
        } catch (error) {
          failedRows.push(`Row ${index + 2}: ${error.message || 'Unable to create tenant company.'}`);
        }
      }

      setBulkUploadSummary({
        fileName: file.name,
        created,
        failed: failedRows.length,
        errors: failedRows,
      });

      if (created > 0) {
        toast.success(`Imported ${created} tenant compan${created === 1 ? 'y' : 'ies'} from bulk upload.`);
      }
      if (failedRows.length > 0) {
        setBulkUploadError(failedRows[0]);
      }
    } catch (error) {
      const message = error.message || 'Unable to read the uploaded file.';
      setBulkUploadError(message);
      toast.error(message);
    } finally {
      setIsBulkImporting(false);
      if (bulkUploadInputRef.current) {
        bulkUploadInputRef.current.value = '';
      }
    }
  };

  const handleAgreementFilesChange = (event) => {
    setAgreementFiles(Array.from(event.target.files || []));
  };

  const handleUploadAgreementDocuments = async () => {
    if (!selectedTenant || agreementFiles.length === 0 || isAgreementUploading) {
      return;
    }

    setIsAgreementUploading(true);
    try {
      const response = await uploadTenantCompanyAgreementDocuments(selectedTenant.recordId || selectedTenant.id, agreementFiles);
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) {
        setTenants(payload.tenants);
        if (Array.isArray(payload.packages)) {
          setAvailablePackages(payload.packages);
        }
      }

      const updatedTenant = payload.tenant || (Array.isArray(payload.tenants)
        ? payload.tenants.find((tenant) => (tenant.recordId || tenant.id) === (selectedTenant.recordId || selectedTenant.id))
        : null);

      if (updatedTenant) {
        setSelectedTenant(updatedTenant);
      }

      toast.success('Agreement documents uploaded successfully.');
      setAgreementFiles([]);
    } catch (error) {
      toast.error(error.message || 'Unable to upload agreement documents.');
    } finally {
      setIsAgreementUploading(false);
    }
  };

  const handleAssignManager = async (employeeId) => {
    if (!selectedTenant || isSaving) return;
    setIsSaving(true);
    try {
      const response = await updateTenantCompanyManager(selectedTenant.recordId || selectedTenant.id, { employeeId });
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) setTenants(payload.tenants);
      if (payload.tenant) setSelectedTenant((prev) => ({ ...prev, ...payload.tenant }));
      toast.success('Manager updated successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to update manager.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateEmployee = async (employeeId) => {
    if (!selectedTenant || isSaving) return;
    setIsSaving(true);
    try {
      const response = await updateTenantCompanyEmployeeStatus(selectedTenant.recordId || selectedTenant.id, employeeId, { status: 'Inactive' });
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) setTenants(payload.tenants);
      if (payload.tenant) setSelectedTenant((prev) => ({ ...prev, ...payload.tenant }));
      toast.success('Employee status updated.');
    } catch (error) {
      toast.error(error.message || 'Unable to update employee status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!selectedTenant || isSaving) return;
    setIsSaving(true);
    try {
      const response = await deleteTenantCompanyEmployee(selectedTenant.recordId || selectedTenant.id, employeeId);
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) setTenants(payload.tenants);
      if (payload.tenant) setSelectedTenant((prev) => ({ ...prev, ...payload.tenant }));
      toast.success('Employee removed successfully.');
      setSelectedEmployee(null);
    } catch (error) {
      toast.error(error.message || 'Unable to remove employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmployeeEditSave = async (event) => {
    event.preventDefault();
    if (!selectedTenant || !editingEmployee || isSaving) return;
    setIsSaving(true);
    try {
      const response = await updateTenantCompanyEmployee(selectedTenant.recordId || selectedTenant.id, editingEmployee.id || '', employeeEditForm);
      const payload = response?.data || {};
      if (Array.isArray(payload.tenants)) setTenants(payload.tenants);
      if (payload.tenant) setSelectedTenant((prev) => ({ ...prev, ...payload.tenant }));
      toast.success('Employee details updated successfully.');
      setEditingEmployee(null);
      setSelectedEmployee(null);
      setEmployeeEditForm({ name: '', phone: '', designation: '', role: 'Employee' });
    } catch (error) {
      toast.error(error.message || 'Unable to update employee details.');
    } finally {
      setIsSaving(false);
    }
  };

  const syncTenantCollections = (payload = {}, preferredTenantId = '') => {
    if (Array.isArray(payload.tenants)) {
      setTenants(payload.tenants);
      if (Array.isArray(payload.packages)) {
        setAvailablePackages(payload.packages);
      }

      if (preferredTenantId) {
        return payload.tenants.find((tenant) => String(tenant.recordId || tenant.id) === String(preferredTenantId)) || payload.tenant || null;
      }

      return payload.tenant || null;
    }

    if (payload.tenant) {
      const nextTenant = payload.tenant;
      const nextTenantId = String(nextTenant.recordId || nextTenant.id);

      setTenants((current) => {
        const exists = current.some((tenant) => String(tenant.recordId || tenant.id) === nextTenantId);
        return exists
          ? current.map((tenant) => (String(tenant.recordId || tenant.id) === nextTenantId ? nextTenant : tenant))
          : [nextTenant, ...current];
      });

      return nextTenant;
    }

    return null;
  };

  const handlePackageSelection = (pricingPackageId) => {
    if (pricingPackageId === '__custom__') {
      if (isTenantPackageLocked) {
        toast.error('This tenant package is locked and cannot be cleared from the edit form.');
        return;
      }

      const clearedDefaults = buildTenantPackageDefaults(null);
      const clearedDurationFields = buildDurationFields();
      setCompanyForm((prev) => ({
        ...prev,
        pricingPackageId: '__custom__',
        planType: 'Custom',
        creditsAllocated: 0,
        ...clearedDurationFields,
        companyDetails: {
          ...(prev.companyDetails || {}),
          ...clearedDefaults.companyDetails,
        },
        agreementDetails: {
          ...(prev.agreementDetails || {}),
          ...clearedDefaults.agreementDetails,
        },
        packageDetails: {
          ...(prev.packageDetails || {}),
          ...clearedDefaults.packageDetails,
          selectionFloor: '',
          selectionWing: '',
          selectionBlockMix: 'all',
        },
        creditConfiguration: {
          ...(prev.creditConfiguration || {}),
          ...clearedDefaults.creditConfiguration,
        },
        billingDetails: {
          ...(prev.billingDetails || {}),
          securityDepositPaidStatus: prev.billingDetails?.securityDepositPaidStatus || 'Pending',
        },
      }));
      return;
    }

    if (!pricingPackageId) {
      if (isTenantPackageLocked) {
        toast.error('This tenant package is locked and cannot be cleared from the edit form.');
        return;
      }

      const clearedDefaults = buildTenantPackageDefaults(null);
      const clearedDurationFields = buildDurationFields();
      setCompanyForm((prev) => ({
        ...prev,
        pricingPackageId: '',
        planType: 'Custom',
        creditsAllocated: 0,
        ...clearedDurationFields,
        companyDetails: {
          ...(prev.companyDetails || {}),
          ...clearedDefaults.companyDetails,
        },
        agreementDetails: {
          ...(prev.agreementDetails || {}),
          ...clearedDefaults.agreementDetails,
        },
        packageDetails: {
          ...(prev.packageDetails || {}),
          ...clearedDefaults.packageDetails,
          selectionFloor: '',
          selectionWing: '',
          selectionBlockMix: 'all',
        },
        creditConfiguration: {
          ...(prev.creditConfiguration || {}),
          ...clearedDefaults.creditConfiguration,
        },
        billingDetails: {
          ...(prev.billingDetails || {}),
          securityDepositPaidStatus: prev.billingDetails?.securityDepositPaidStatus || 'Pending',
        },
      }));
      return;
    }

    const selectedPackage = packageLookup.get(String(pricingPackageId));
    if (!selectedPackage) {
      toast.error('Selected package is not available.');
      return;
    }

    const assignedCompanyId = String(selectedPackage.assignedTenantCompanyId || '').trim();
    const currentTenantId = String(selectedTenant?.recordId || selectedTenant?.id || '').trim();
    if (assignedCompanyId && assignedCompanyId !== currentTenantId) {
      toast.error('This package is already assigned to another tenant company.');
      return;
    }

    const packageDefaults = buildTenantPackageDefaults(selectedPackage);
    setCompanyForm((prev) => ({
      ...prev,
      pricingPackageId,
      planType: selectedPackage?.name || prev.planType,
      creditsAllocated: Number(selectedPackage?.creditsIncluded || prev.creditsAllocated || 0),
      contractDuration: durationLabelFromMonths(selectedPackage?.durationMonths),
      customDurationMonths: '',
      companyDetails: {
        ...(prev.companyDetails || {}),
        ...packageDefaults.companyDetails,
      },
      agreementDetails: {
        ...(prev.agreementDetails || {}),
        ...packageDefaults.agreementDetails,
        lockInPeriod: selectedPackage?.durationMonths ? String(selectedPackage.durationMonths) : '',
      },
      packageDetails: {
        ...(prev.packageDetails || {}),
        ...packageDefaults.packageDetails,
      },
      creditConfiguration: {
        ...(prev.creditConfiguration || {}),
        ...packageDefaults.creditConfiguration,
      },
      billingDetails: {
        ...(prev.billingDetails || {}),
        securityDepositPaidStatus: prev.billingDetails?.securityDepositPaidStatus || 'Pending',
      },
    }));
  };

  const openAddCompanyModal = () => {
    setSelectedTenant(null);
    setEmployeeModalOpen(false);
    setAgreementFiles([]);
    setFormError('');
    setCompanyForm({
      ...initialCompanyForm,
      pricingPackageId: '',
      planType: 'Custom',
      creditsAllocated: 0,
      contractDuration: '',
      customDurationMonths: '',
      companyDetails: {
        ...initialCompanyForm.companyDetails,
      },
      agreementDetails: {
        ...initialCompanyForm.agreementDetails,
      },
      packageDetails: {
        ...initialCompanyForm.packageDetails,
      },
      creditConfiguration: {
        ...initialCompanyForm.creditConfiguration,
      },
      billingDetails: {
        ...initialCompanyForm.billingDetails,
        securityDepositPaidStatus: 'Pending',
      },
    });
    setActiveModal('add');
  };

  const prepareCompanyFormForTenant = (tenant) => {
    const rawPackageId = tenant.pricingPackageId || tenant.packageId || '';
    const matchedPackage = packageLookup.get(String(rawPackageId));
    const packageId = matchedPackage ? String(rawPackageId) : '';
    const savedTenantPackage = tenant.packageDetails?.packageName
      ? {
        _id: rawPackageId || tenant.packageId || tenant.pricingPackageId || '',
        recordId: rawPackageId || tenant.packageId || tenant.pricingPackageId || '',
        id: rawPackageId || tenant.packageId || tenant.pricingPackageId || '',
        name: tenant.packageDetails.packageName || tenant.packageName || tenant.planType || '',
        durationMonths: tenant.packageDurationMonths || tenant.contractDurationMonths || tenant.billingDetails?.contractDurationMonths || 12,
        creditsIncluded: tenant.packageDetails.monthlyTotalCredits || tenant.creditsTotal || 0,
        totalSeats: tenant.companyDetails?.openDesks || tenant.companyDetails?.cabinDesks
          ? Number(tenant.companyDetails?.openDesks || 0) + Number(tenant.companyDetails?.cabinDesks || 0)
          : (tenant.packageDetails.totalSeats || 0),
        openDesks: tenant.companyDetails?.openDesks || tenant.packageDetails.openDesks || 0,
        cabinDesks: tenant.companyDetails?.cabinDesks || tenant.packageDetails.cabinDesks || 0,
        ratePerOpenDesk: tenant.companyDetails?.ratePerOpenDesk || tenant.packageDetails.ratePerOpenDesk || 0,
        ratePerCabinDesk: tenant.companyDetails?.ratePerCabinDesk || tenant.packageDetails.ratePerCabinDesk || 0,
        creditsPerSeat: tenant.packageDetails.creditsPerSeat || 0,
        monthlyCredits: tenant.packageDetails.monthlyTotalCredits || tenant.creditsTotal || 0,
        locationMappings: dedupeLocationMappings(Array.isArray(tenant.packageDetails.locationMappings) ? tenant.packageDetails.locationMappings : []),
      }
      : null;
    const activePackage = savedTenantPackage
      ? {
        ...(matchedPackage || {}),
        ...savedTenantPackage,
      }
      : matchedPackage;
    const durationFields = buildDurationFields(tenant.contractDurationMonths || matchedPackage?.durationMonths || 12);
    const packageDefaults = buildTenantPackageDefaults(activePackage);
    const normalizedStartDate = parseDateForInput(tenant.agreementDetails?.startDate || tenant.contractStartAt || tenant.contractStart || tenant.startDate || '');
    const normalizedEndDate = parseDateForInput(tenant.agreementDetails?.endDate || tenant.contractEndAt || tenant.contractEnd || tenant.endDate || '');
    const annualIncrement = activePackage
      ? String(deriveAnnualIncrementAmount(packageDefaults.companyDetails, packageDefaults.packageDetails, activePackage.durationMonths || durationFields.durationMonths || 1))
      : String(tenant.agreementDetails?.annualIncrement || '');
    return {
      ...initialCompanyForm,
      companyName: tenant.companyName || '',
      contactName: tenant.contactName || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      businessType: tenant.businessType || tenant.customerDetails?.sector || '',
      pricingPackageId: packageId ? String(packageId) : '',
      planType: activePackage?.name || tenant.package || tenant.planType || 'Custom',
      creditsAllocated: Number(tenant.creditsTotal || tenant.creditsAllocated || activePackage?.creditsIncluded || 0),
      contractDuration: activePackage ? durationLabelFromMonths(activePackage.durationMonths) : durationFields.contractDuration,
      customDurationMonths: activePackage ? '' : durationFields.customDurationMonths,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      companyDetails: activePackage
        ? {
          ...packageDefaults.companyDetails,
          ...(tenant.companyDetails || {}),
        }
        : {
          buildingName: tenant.companyDetails?.buildingName || '',
          unitNo: tenant.companyDetails?.unitNo || '',
          cabinDesks: String(tenant.companyDetails?.cabinDesks || ''),
          ratePerCabinDesk: String(tenant.companyDetails?.ratePerCabinDesk || ''),
          openDesks: String(tenant.companyDetails?.openDesks || ''),
          ratePerOpenDesk: String(tenant.companyDetails?.ratePerOpenDesk || ''),
          status: tenant.companyDetails?.status || tenant.status || 'Active',
        },
      customerDetails: {
        clientName: tenant.customerDetails?.clientName || tenant.companyName || '',
        sector: tenant.customerDetails?.sector || tenant.businessType || '',
        hoCountry: tenant.customerDetails?.hoCountry || '',
        hoState: tenant.customerDetails?.hoState || '',
        hoCity: tenant.customerDetails?.hoCity || '',
      },
      agreementDetails: {
        ...(tenant.agreementDetails || {}),
        annualIncrement,
        perDeskMeetingCredits: activePackage
          ? String(packageDefaults.agreementDetails.perDeskMeetingCredits || '')
          : String(tenant.agreementDetails?.perDeskMeetingCredits || ''),
        totalMeetingCredits: activePackage
          ? String(packageDefaults.agreementDetails.totalMeetingCredits || '')
          : String(tenant.agreementDetails?.totalMeetingCredits || tenant.creditsAllocated || ''),
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        lockInPeriod: String(tenant.agreementDetails?.lockInPeriod || tenant.contractDurationMonths || 12),

      },
      pocDetails: {
        localPocName: tenant.pocDetails?.localPocName || tenant.contactName || '',
        localPocEmail: tenant.pocDetails?.localPocEmail || tenant.email || '',
        localPocPhone: tenant.pocDetails?.localPocPhone || tenant.phone || '',
        hoPocName: tenant.pocDetails?.hoPocName || '',
        hoPocEmail: tenant.pocDetails?.hoPocEmail || '',
        hoPocPhone: tenant.pocDetails?.hoPocPhone || '',
      },
      packageDetails: {
        ...(tenant.packageDetails || {}),
        packageName: activePackage ? packageDefaults.packageDetails.packageName : (tenant.packageDetails?.packageName || tenant.packageName || tenant.planType || ''),
        totalSeats: activePackage
          ? packageDefaults.packageDetails.totalSeats
          : String((tenant.companyDetails?.openDesks || 0) + (tenant.companyDetails?.cabinDesks || 0) || tenant.packageDetails?.totalSeats || tenant.space?.seats?.length || ''),
        openDesks: activePackage ? packageDefaults.packageDetails.openDesks : String(tenant.companyDetails?.openDesks || tenant.packageDetails?.openDesks || ''),
        cabinDesks: activePackage ? packageDefaults.packageDetails.cabinDesks : String(tenant.companyDetails?.cabinDesks || tenant.packageDetails?.cabinDesks || ''),
        creditsPerSeat: activePackage ? packageDefaults.packageDetails.creditsPerSeat : String(tenant.packageDetails?.creditsPerSeat || ''),
        monthlyTotalCredits: activePackage ? packageDefaults.packageDetails.monthlyTotalCredits : String(tenant.packageDetails?.monthlyTotalCredits || tenant.creditConfiguration?.monthlyTotalCredits || tenant.creditsAllocated || 0),
        locationMappings: activePackage ? packageDefaults.packageDetails.locationMappings : normalizeLocationMappings(tenant.packageDetails?.locationMappings || []),
        selectionFloor: activePackage ? packageDefaults.packageDetails.selectionFloor : String(tenant.packageDetails?.selectionFloor || ''),
        selectionWing: activePackage ? packageDefaults.packageDetails.selectionWing : String(tenant.packageDetails?.selectionWing || ''),
        selectionBlockMix: activePackage ? packageDefaults.packageDetails.selectionBlockMix : String(tenant.packageDetails?.selectionBlockMix || 'all'),
        creditResetCycle: activePackage ? 'Monthly' : (tenant.packageDetails?.creditResetCycle || tenant.creditConfiguration?.creditResetCycle || 'Monthly'),
        creditUsageTracking: tenant.packageDetails?.creditUsageTracking || tenant.creditConfiguration?.creditUsageTracking || '',
      },
      creditConfiguration: {
        ...(tenant.creditConfiguration || {}),
        monthlyTotalCredits: activePackage ? packageDefaults.creditConfiguration.monthlyTotalCredits : String(tenant.creditConfiguration?.monthlyTotalCredits || tenant.packageDetails?.monthlyTotalCredits || tenant.creditsAllocated || 0),
        creditResetCycle: activePackage ? 'Monthly' : (tenant.creditConfiguration?.creditResetCycle || tenant.packageDetails?.creditResetCycle || 'Monthly'),
        creditUsageTracking: tenant.creditConfiguration?.creditUsageTracking || tenant.packageDetails?.creditUsageTracking || '',
      },
      billingDetails: {
        securityDepositPaidStatus: tenant.billingDetails?.securityDepositPaidStatus || 'Pending',
      },
      addOnCredits: {
        purchasedCredits: String(tenant.addOnCredits?.purchasedCredits || ''),
        remainingCredits: String(tenant.addOnCredits?.remainingCredits || tenant.creditsRemaining || ''),
      },
      creditsUsed: Number(tenant.creditsUsed || 0),
      notes: tenant.notes || '',
    };
  };

  const buildHydratedTenantSnapshot = (tenant) => {
    const hydratedForm = prepareCompanyFormForTenant(tenant);

    return {
      ...tenant,
      companyDetails: {
        ...(hydratedForm.companyDetails || {}),
        ...(tenant.companyDetails || {}),
      },
      agreementDetails: {
        ...(hydratedForm.agreementDetails || {}),
        ...(tenant.agreementDetails || {}),
      },
      packageDetails: {
        ...(hydratedForm.packageDetails || {}),
        ...(tenant.packageDetails || {}),
      },
      billingDetails: {
        ...(hydratedForm.billingDetails || {}),
        ...(tenant.billingDetails || {}),
      },
      spaceAssigned: {
        totalSeats: Number(hydratedForm.packageDetails?.totalSeats || tenant.spaceAssigned?.totalSeats || 0),
        openDesks: Number(hydratedForm.packageDetails?.openDesks || tenant.spaceAssigned?.openDesks || 0),
        cabinDesks: Number(hydratedForm.packageDetails?.cabinDesks || tenant.spaceAssigned?.cabinDesks || 0),
        ...(tenant.spaceAssigned || {}),
        assignedSeats: Array.isArray(tenant.spaceAssigned?.assignedSeats) && tenant.spaceAssigned.assignedSeats.length > 0
          ? tenant.spaceAssigned.assignedSeats
          : Array.isArray(tenant.space?.seats) && tenant.space.seats.length > 0
            ? tenant.space.seats
            : [],
      },
      space: {
        ...(tenant.space || {}),
        seats: Array.isArray(tenant.space?.seats) && tenant.space.seats.length > 0
          ? tenant.space.seats
          : Array.isArray(tenant.spaceAssigned?.assignedSeats)
            ? tenant.spaceAssigned.assignedSeats
            : [],
      },
    };
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending Setup': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-wider"><Clock size={12} /> Pending Setup</span>;
      case 'Pending Space Assignment': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black uppercase tracking-wider"><LayoutGrid size={12} /> Pending Space Assignment</span>;
      case 'Active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-black uppercase tracking-wider"><CheckCircle2 size={12} /> Active</span>;
      case 'Expiring Soon': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-black uppercase tracking-wider"><AlertTriangle size={12} /> Expiring Soon</span>;
      case 'Expired': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-black uppercase tracking-wider"><XCircle size={12} /> Expired</span>;
      default: return null;
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Tenant Companies...</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="mb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Sales Tenant Companies
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Manage client contracts, allocations and company profiles.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => handleExportCompaniesReport('PDF')}
                disabled={Boolean(isExportingReport)}
                title="Export PDF"
                className="px-4 py-2.5 bg-white text-[#0F172A] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown size={14} className="text-red-500" /> {isExportingReport === 'PDF' ? 'Exporting...' : ''}
              </button>
              <button
                type="button"
                onClick={() => handleExportCompaniesReport('Excel')}
                disabled={Boolean(isExportingReport)}
                title="Export Excel"
                className="px-4 py-2.5 bg-[#ffffff] text-[#1fd628] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSpreadsheet size={14} /> {isExportingReport === 'Excel' ? 'Exporting...' : ''}
              </button>
              <button
                type="button"
                onClick={handleBulkUploadClick}
                title="Bulk Upload"
                className="px-4 py-2.5 bg-white text-[#0F172A] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <UploadCloud size={14} />
              </button>

            </div>
          </div>
          <input ref={bulkUploadInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFileSelected} className="hidden" />

          <div className="mb-8 mt-8 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'companies' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              Tenant companies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              Extra credits requests
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 shrink-0">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.key} className={card.cardClass}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-black text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass}`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>


          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-110">

            <div className={`p-3 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-3 shrink-0 bg-slate-50/50 ${activeTab === 'companies' ? '' : 'hidden'}`}>
              <div className="relative w-full xl:w-72 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Search company or contact person..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-medium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>

              <div className="flex flex-wrap ml-auto items-center gap-2 w-full xl:w-auto">
                <select className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer" value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)}>
                  <option>All Packages</option>
                  {tenantPackages.map((pkg) => <option key={pkg.recordId || pkg.id} value={pkg.name}>{pkg.name}</option>)}
                </select>
                <select className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All Status</option><option>Active</option><option>Expiring Soon</option><option>Expired</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1 w-10px xl:w-auto">
                <button
                  onClick={openAddCompanyModal}
                  className="px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-black text-[10px] hover:bg-blue-700 shadow-sm transition-all flex items-end justify-center gap-1.5"
                >
                  <Plus size={14} /> ADD TENANT COMPANY
                </button>
              </div>
            </div>

            <div className={`overflow-x-auto flex-1 ${activeTab === 'companies' ? '' : 'hidden'}`}>
              <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2">Company Info</th>
                    <th className="px-3.5 py-2">Contact Details</th>
                    <th className="px-3.5 py-2">Contract Period</th>
                    <th className="px-3.5 py-2">Package & Credits</th>
                    <th className="px-3.5 py-2 text-center">Status</th>
                    <th className="px-3.5 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
                            {getInitials(tenant.companyName)}
                          </div>
                          <div>
                            <p className="font-pmedium text-primary text-sm max-w-37.5 truncate" title={tenant.companyName}>{tenant.companyName}</p>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{tenant.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 space-y-1">
                        <p className="font-bold text-slate-800 text-xs">{tenant.contactName}</p>
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><Mail size={10} /> {tenant.email}</p>
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><Phone size={10} /> {tenant.phone}</p>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <p className="text-xs font-bold text-slate-700">{tenant.contractStart}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <p className="text-xs font-bold text-slate-700">{tenant.contractEnd}</p>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 space-y-1.5">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-black uppercase tracking-wider">
                          {tenant.packageName || tenant.package}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                          <CreditCard size={12} className="text-slate-400" /> {tenant.creditsRemaining ?? 0} / {tenant.creditsAllocated ?? 0} Cr
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        {getStatusBadge(tenant.status)}
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex flex-wrap items-center justify-center gap-2 transition-opacity">
                          <button onClick={() => navigate(`/sales-crm/tenant-companies/${tenant.recordId || tenant.id}`)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all shadow-sm" title="View Profile">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => {
                            const hydratedTenant = buildHydratedTenantSnapshot(tenant);
                            setCompanyForm(prepareCompanyFormForTenant(hydratedTenant));
                            setSelectedTenant(hydratedTenant); setAgreementFiles([]); setActiveModal('edit');
                          }}
                            className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all shadow-sm" title="Edit Contact/Package"
                          >
                            <Edit size={14} />
                          </button>
                          <button onClick={() => {
                            const hydratedTenant = buildHydratedTenantSnapshot(tenant);
                            setCompanyForm(prepareCompanyFormForTenant(hydratedTenant));
                            setSelectedTenant(hydratedTenant); setAgreementFiles([]); setActiveModal('renew');
                          }}
                            className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 rounded-lg transition-all shadow-sm" title="Renew Contract"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedTenants.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-bold bg-slate-50/50">No companies match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {activeTab === 'requests' && (
              <div className="flex flex-1 flex-col p-2">
                <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-1 flex-col">
                  <div className="p-3 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 bg-slate-50/50">
                    <div>
                      <h3 className="text-base font-pmedium text-primary">Extra credits requests</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                      <input
                        type="text"
                        placeholder="Search requests..."
                        className="w-full xl:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <select
                        className="w-full xl:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                        value={requestStatusFilter}
                        onChange={(e) => setRequestStatusFilter(e.target.value)}
                      >
                        <option>All Requests</option>
                        <option value="PENDING_SALES_APPROVAL">Pending Sales Approval</option>
                        <option value="APPROVED_AWAITING_PAYMENT">Awaiting Payment</option>
                        <option value="PAYMENT_SUBMITTED">Payment Submitted</option>
                        <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
                        <option value="INVOICE_GENERATED">Invoice Generated</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                      <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                        <tr>
                          <th className="px-3.5 py-2">Tenant</th>
                          <th className="px-3.5 py-2">Requested credits</th>
                          <th className="px-3.5 py-2">Status</th>
                          <th className="px-3.5 py-2">Invoice</th>
                          <th className="px-3.5 py-2">Requested by</th>
                          <th className="px-3.5 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {displayedCreditRequests.map((request) => (
                          <tr key={request.id || `${request.tenantCompanyId}-${request.requestedAtAt}`} className="hover:bg-blue-50/30 transition-all group">
                            <td className="px-3.5 py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 border border-slate-200">
                                  {getInitials(request.tenantCompanyName || 'TC')}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-sm max-w-45 truncate" title={request.tenantCompanyName}>{request.tenantCompanyName}</p>
                                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{request.tenantCompanyCode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="space-y-1.5">
                                <p className="text-lg font-black text-slate-950">{formatInteger(request.requestedCredits)} <span className="text-xs text-slate-400">CR</span></p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{formatCurrency(request.totalAmount || 0)} at {formatCurrency(request.ratePerCredit || 0)} / CR</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current balance: {formatInteger(request.currentCredits || 0)} CR</p>
                              </div>
                            </td>
                            <td className="px-3.5 py-2">
                              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${getCreditRequestStatusClass(request.status)}`}>
                                {getCreditRequestStatusLabel(request.status)}
                              </span>
                              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice {request.invoiceStatus || 'Pending'}</p>
                              {request.paymentTransactionId && (
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">TXN {request.paymentTransactionId}</p>
                              )}
                            </td>
                            <td className="px-3.5 py-2">
                              <p className="font-bold text-slate-800 text-xs">{request.invoiceNumber || 'Pending'}</p>
                              {request.invoiceFileUrl ? (
                                <a href={request.invoiceFileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">View invoice</a>
                              ) : (
                                <p className="mt-1 text-[10px] font-medium text-slate-400">Finance will attach the invoice file here.</p>
                              )}
                              {request.paymentProofFileUrl && (
                                <a href={request.paymentProofFileUrl} target="_blank" rel="noreferrer" className="mt-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700">View proof</a>
                              )}
                            </td>
                            <td className="px-3.5 py-2">
                              <p className="font-bold text-slate-800 text-xs">{request.requestedByName || '--'}</p>
                              <p className="mt-1 text-[10px] font-medium text-slate-400">{formatDateLabel(request.requestedAtAt || request.requestedAt)}</p>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="flex flex-wrap items-center justify-center gap-2 transition-opacity">
                                {request.status === 'PENDING_SALES_APPROVAL' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCreditRequestAction(request, 'APPROVED_AWAITING_PAYMENT')}
                                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-green-700 transition-all hover:bg-green-100"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCreditRequestAction(request, 'REJECTED')}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-all hover:bg-rose-100"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {request.status === 'PAYMENT_SUBMITTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCreditRequestAction(request, 'PAYMENT_CONFIRMED')}
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:bg-blue-100"
                                  >
                                    Verify payment
                                  </button>
                                )}
                                {['PAYMENT_CONFIRMED', 'INVOICE_GENERATED'].includes(request.status) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCreditRequestAction(request, 'COMPLETED')}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-100"
                                  >
                                    Add credits
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {displayedCreditRequests.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-20 text-slate-400 font-bold bg-slate-50/50">No credit requests match the current filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isBulkUploadOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
              <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
                <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white">
                  <div>
                    <h2 className="mt-1.5 text-base font-pmedium text-white">Upload Tenant Companies</h2>
                    <p className="mt-1.5 max-w-xl text-[12px] font-medium text-slate-300">
                      Import only the onboarding text fields. Building name comes from sales architecture later, and package or contract values are filled during edit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsBulkUploadOpen(false); setBulkUploadError(''); setBulkUploadSummary(null); setBulkUploadFileName(''); }}
                    className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white transition-all hover:bg-red-500 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={downloadBulkTemplate}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-700 transition-all hover:border-slate-300 hover:bg-white"
                    >
                      <Download size={14} /> Download template
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkUploadInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100"
                    >
                      <UploadCloud size={14} /> Choose file
                    </button>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Template rules</p>
                    <div className="mt-2 grid gap-2 text-[12px] text-slate-700 md:grid-cols-2">
                      <p className="rounded-xl bg-white px-3 py-2 font-medium shadow-sm">Use one row per tenant company.</p>
                      <p className="rounded-xl bg-white px-3 py-2 font-medium shadow-sm">Use unit numbers like 701 A, 601 B, or 501 A.</p>
                      <p className="rounded-xl bg-white px-3 py-2 font-medium shadow-sm">Do not include building name, package, rates, seats, or contract dates.</p>
                      <p className="rounded-xl bg-white px-3 py-2 font-medium shadow-sm">Those values are added later when the manager edits the record.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Selected file</p>
                        <h3 className="mt-0.5 text-[13px] font-bold text-slate-900">{bulkUploadFileName || 'No file selected yet'}</h3>
                      </div>
                      {isBulkImporting && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">Importing</span>
                      )}
                    </div>

                    {bulkUploadSummary && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Created</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">{bulkUploadSummary.created}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Failed</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">{bulkUploadSummary.failed}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">File</p>
                          <p className="mt-0.5 text-[12px] font-semibold text-slate-900 break-all">{bulkUploadSummary.fileName}</p>
                        </div>
                      </div>
                    )}

                    {bulkUploadError && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-700">
                        {bulkUploadError}
                      </div>
                    )}

                    {bulkUploadSummary?.errors?.length > 0 && (
                      <div className="mt-3 max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700">Row errors</p>
                        <ul className="mt-1.5 space-y-1 text-[11px] font-medium text-amber-800">
                          {bulkUploadSummary.errors.map((errorText) => (
                            <li key={errorText}>{errorText}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => { setIsBulkUploadOpen(false); setBulkUploadError(''); setBulkUploadSummary(null); setBulkUploadFileName(''); }}
                        className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkUploadInputRef.current?.click()}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-700"
                      >
                        Select file
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeModal === 'add' || activeModal === 'edit' || activeModal === 'renew') && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/70">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-base font-pmedium text-primary flex items-center gap-2">
                      {activeModal === 'add' ? <><Building size={18} /> Add Tenant Company</> : activeModal === 'edit' ? <><Edit size={18} /> Edit Tenant Details</> : <><RefreshCw size={18} /> Renew Contract</>}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {activeModal === 'renew' && selectedTenant ? `Renewing: ${selectedTenant.companyName}` : activeModal === 'edit' && selectedTenant ? `Editing: ${selectedTenant.companyName}` : 'Register a new corporate client'}
                    </p>
                  </div>
                  <button onClick={() => { setActiveModal(null); setSelectedTenant(null); setCompanyForm(initialCompanyForm); setAgreementFiles([]); setFormError(''); }} className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"><X size={16} /></button>
                </div>

                <form onSubmit={handleSaveCompany} className="p-4 sm:p-5 overflow-y-auto flex flex-1 flex-col gap-4 bg-white">

                  {activeModal !== 'renew' && (
                    <div className="order-5 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">5. Profile & Contact</h3>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Name *</label>
                        <input required type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.companyName} onChange={e => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Type</label>
                        <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.businessType} onChange={e => setCompanyForm({ ...companyForm, businessType: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Person *</label>
                          <input required type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.contactName} onChange={e => setCompanyForm({ ...companyForm, contactName: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email *</label>
                          <input required type="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone *</label>
                          <input required type="tel" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="order-3 space-y-3">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <CreditCard size={14} />
                      Billing Details
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Calculated from desk allocation and contract duration. Security deposit is fixed at 25% of the total contract amount.
                    </p>
                    {formError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-700">
                        {formError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contract Duration</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          value={companyForm.agreementDetails?.lockInPeriod || ''}
                          onChange={(e) => {
                            const nextDurationMonths = e.target.value;
                            const numericDurationMonths = Number(nextDurationMonths);
                            const nextDurationLabel = durationLabelFromMonths(nextDurationMonths);

                            setCompanyForm((prev) => ({
                              ...prev,
                              contractDuration: nextDurationLabel,
                              customDurationMonths: nextDurationLabel === 'Custom' ? String(nextDurationMonths) : '',
                              agreementDetails: {
                                ...(prev.agreementDetails || {}),
                                lockInPeriod: nextDurationMonths,
                                annualIncrement: String(deriveAnnualIncrementAmount(prev.companyDetails, prev.packageDetails, Number.isFinite(numericDurationMonths) ? numericDurationMonths : 0)),
                              },
                            }));
                          }}
                        />
                        {isContractDurationInvalid && (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">
                            Contract duration must be at least 3 months.
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Rent</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-900 outline-none"
                          value={formatCurrency(billingSummary.monthlyRent)}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Contract Amount</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-900 outline-none"
                          value={formatCurrency(billingSummary.totalContractAmount)}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Deposit Amount</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-semibold text-emerald-900 outline-none"
                          value={formatCurrency(billingSummary.securityDepositAmount)}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Deposit Paid</label>
                        <select
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                          value={companyForm.billingDetails?.securityDepositPaidStatus || 'Pending'}
                          onChange={(e) => updateCompanySection('billingDetails', 'securityDepositPaidStatus', e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>
                    {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                         <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Floor</label>
                           <select
                             className="w-full rounded-xl border-2 border-indigo-200 bg-white px-4 py-3.5 text-sm font-bold text-indigo-900 outline-none"
                             value={customPackageFloor}
                             onChange={(e) => setCompanyForm((prev) => ({
                               ...prev,
                               packageDetails: {
                                 ...(prev.packageDetails || {}),
                                 selectionFloor: e.target.value,
                                 selectionWing: '',
                               },
                             }))}
                           >
                             <option value="">Select floor</option>
                             {customPackageFloorOptions.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
                           </select>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Wing</label>
                           <select
                             className="w-full rounded-xl border-2 border-indigo-200 bg-white px-4 py-3.5 text-sm font-bold text-indigo-900 outline-none"
                             value={customPackageWing}
                             onChange={(e) => setCompanyForm((prev) => ({
                               ...prev,
                               packageDetails: {
                                 ...(prev.packageDetails || {}),
                                 selectionWing: e.target.value.toUpperCase(),
                               },
                             }))}
                           >
                             <option value="">Select wing</option>
                             {customPackageWingOptions.map((wing) => <option key={wing} value={wing}>{wing}</option>)}
                           </select>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Block Mix</label>
                           <select
                             className="w-full rounded-xl border-2 border-indigo-200 bg-white px-4 py-3.5 text-sm font-bold text-indigo-900 outline-none"
                             value={customPackageBlockMix}
                             onChange={(e) => setCompanyForm((prev) => ({
                               ...prev,
                               packageDetails: {
                                 ...(prev.packageDetails || {}),
                                 selectionBlockMix: e.target.value,
                               },
                             }))}
                           >
                             {tenantBlockMixOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                           </select>
                         </div>
                       </div> */}
                    {/* <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                         <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                           <div className="mb-3 flex items-center justify-between gap-3">
                             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Open Desk Blocks</p>
                             <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">{customPackageVisibleOpenAreaResources.length}</span>
                           </div>
                           <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                             {customPackageVisibleOpenAreaResources.length > 0 ? customPackageVisibleOpenAreaResources.map((resource) => {
                               const resourceKey = getTenantResourceSelectionKey(resource);
                               const selected = customPackageSelectedResourceKeys.has(resourceKey);
                               return (
                                 <button key={resourceKey || resource.resourceCode} type="button" onClick={() => toggleLocationMapping(resource)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? 'border-emerald-300 bg-white shadow-sm' : 'border-emerald-100 bg-white/80 hover:border-emerald-200'}`}>
                                   <div className="flex items-center justify-between gap-3">
                                     <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                       <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">{resource.floor || '--'} / {resource.wing || '--'} - {resource.inventoryMode === 'single' ? 'Single' : 'Area'}</p>
                                     </div>
                                     <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">{selected ? 'Selected' : `${Number(resource.capacity || 1)} seats`}</span>
                                   </div>
                                 </button>
                               );
                             }) : (
                               <div className="rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-4 text-center text-xs font-medium text-emerald-700">No open desk blocks found in this scope.</div>
                             )}
                           </div>
                         </div>
                         <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                           <div className="mb-3 flex items-center justify-between gap-3">
                             <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Cabin Desk Blocks</p>
                             <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">{customPackageVisibleCabinAreaResources.length}</span>
                           </div>
                           <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                             {customPackageVisibleCabinAreaResources.length > 0 ? customPackageVisibleCabinAreaResources.map((resource) => {
                               const resourceKey = getTenantResourceSelectionKey(resource);
                               const selected = customPackageSelectedResourceKeys.has(resourceKey);
                               return (
                                 <button key={resourceKey || resource.resourceCode} type="button" onClick={() => toggleLocationMapping(resource)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? 'border-blue-300 bg-white shadow-sm' : 'border-blue-100 bg-white/80 hover:border-blue-200'}`}>
                                   <div className="flex items-center justify-between gap-3">
                                     <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                       <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-500">{resource.floor || '--'} / {resource.wing || '--'} - {resource.inventoryMode === 'single' ? 'Single' : 'Area'}</p>
                                     </div>
                                     <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">{selected ? 'Selected' : `${Number(resource.capacity || 1)} seats`}</span>
                                   </div>
                                 </button>
                               );
                             }) : (
                               <div className="rounded-xl border border-dashed border-blue-200 bg-white px-3 py-4 text-center text-xs font-medium text-blue-700">No cabin desk blocks found in this scope.</div>
                             )}
                           </div>
                         </div>
                       </div> */}
                    {/* <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                         <div className="flex items-center justify-between gap-3">
                           <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Single Open Desks</p>
                           <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-sky-700">{customPackageVisibleSingleOpenDeskResources.length}</span>
                         </div>
                         <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                           {customPackageVisibleSingleOpenDeskResources.length > 0 ? customPackageVisibleSingleOpenDeskResources.map((resource) => {
                             const resourceKey = getTenantResourceSelectionKey(resource);
                             const selected = customPackageSelectedResourceKeys.has(resourceKey);
                             return (
                               <button key={resourceKey || resource.resourceCode} type="button" onClick={() => toggleLocationMapping(resource)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? 'border-sky-300 bg-white shadow-sm' : 'border-sky-100 bg-white/80 hover:border-sky-200'}`}>
                                 <div className="flex items-center justify-between gap-3">
                                   <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                     <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-500">{resource.floor || '--'} / {resource.wing || '--'} - Single open desk</p>
                                   </div>
                                   <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-sky-700">{selected ? 'Selected' : 'Add'}</span>
                                 </div>
                               </button>
                             );
                           }) : (
                             <div className="rounded-xl border border-dashed border-sky-200 bg-white px-3 py-4 text-center text-xs font-medium text-sky-700">No single open desks found in this scope.</div>
                           )}
                         </div>
                        </div> */}
                  </div>

                  {activeModal !== 'renew' && (
                    <div className="order-6 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">6. Customer Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO POC Name</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.hoPocName} onChange={(e) => updateCompanySection('pocDetails', 'hoPocName', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO POC Email</label>
                          <input type="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.hoPocEmail} onChange={(e) => updateCompanySection('pocDetails', 'hoPocEmail', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO POC Phone</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.hoPocPhone} onChange={(e) => updateCompanySection('pocDetails', 'hoPocPhone', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector</label>
                          {!showCustomSector ? (
                            <div className="space-y-2">
                              <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                                value={allSectorOptions.includes(companyForm.customerDetails.sector) ? companyForm.customerDetails.sector : ''}
                                onChange={(e) => {
                                  setShowCustomSector(false);
                                  updateCompanySection('customerDetails', 'sector', e.target.value);
                                }}
                              >
                                <option value="">Select sector</option>
                                {allSectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => { setShowCustomSector(true); updateCompanySection('customerDetails', 'sector', ''); }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                + Add custom sector
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                required
                                type="text"
                                placeholder="Type new sector name"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-indigo-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={companyForm.customerDetails.sector}
                                onChange={(e) => updateCompanySection('customerDetails', 'sector', e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => { setShowCustomSector(false); updateCompanySection('customerDetails', 'sector', ''); }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                Cancel &amp; pick from list
                              </button>
                            </div>
                          )}
                          {!showCustomSector && companyForm.customerDetails.sector === '' && (
                            <p className="text-[9px] font-bold text-amber-600">Select or add a sector</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO Country</label>
                          <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            value={companyForm.customerDetails.hoCountry}
                            onChange={(e) => updateCompanySection('customerDetails', 'hoCountry', e.target.value)}
                            disabled={loadingCountries}
                          >
                            <option value="">{loadingCountries ? 'Loading countries...' : 'Select country'}</option>
                            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO State</label>
                          <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            value={companyForm.customerDetails.hoState}
                            onChange={(e) => updateCompanySection('customerDetails', 'hoState', e.target.value)}
                            disabled={!companyForm.customerDetails.hoCountry || loadingStates}
                          >
                            <option value="">{loadingStates ? 'Loading states...' : companyForm.customerDetails.hoCountry ? 'Select state' : 'Select country first'}</option>
                            {states.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HO City</label>
                          <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            value={companyForm.customerDetails.hoCity}
                            onChange={(e) => updateCompanySection('customerDetails', 'hoCity', e.target.value)}
                            disabled={!companyForm.customerDetails.hoState || loadingCities}
                          >
                            <option value="">{loadingCities ? 'Loading cities...' : companyForm.customerDetails.hoState ? 'Select city' : 'Select state first'}</option>
                            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal !== 'renew' && (
                    <div className="order-4 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">4. Company Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Building Name</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.companyDetails.buildingName} onChange={(e) => updateCompanySection('companyDetails', 'buildingName', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit No</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.companyDetails.unitNo} onChange={(e) => updateCompanySection('companyDetails', 'unitNo', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cabin Desks</label>
                          <input type="number" min="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.companyDetails.cabinDesks} onChange={(e) => updateCompanySection('companyDetails', 'cabinDesks', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate Per Cabin Desk</label>
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(companyForm.pricingPackageId)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={companyForm.companyDetails.ratePerCabinDesk}
                            onChange={(e) => updateCompanySection('companyDetails', 'ratePerCabinDesk', e.target.value)}
                          />
                          {companyForm.pricingPackageId && (
                            <p className="text-[9px] font-bold text-indigo-500">Pulled from the selected package.</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Open Desks</label>
                          <input type="number" min="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.companyDetails.openDesks} onChange={(e) => updateCompanySection('companyDetails', 'openDesks', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate Per Open Desk</label>
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(companyForm.pricingPackageId)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={companyForm.companyDetails.ratePerOpenDesk}
                            onChange={(e) => updateCompanySection('companyDetails', 'ratePerOpenDesk', e.target.value)}
                          />
                          {companyForm.pricingPackageId && (
                            <p className="text-[9px] font-bold text-indigo-500">Pulled from the selected package.</p>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                          <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer" value={companyForm.companyDetails.status} onChange={(e) => updateCompanySection('companyDetails', 'status', e.target.value)}>
                            <option>Active</option>
                            <option>Expiring Soon</option>
                            <option>Expired</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal !== 'renew' && (
                    <div className="order-7 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">7. Agreement Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Annual Increment</label>
                          <input type="number" min="0" readOnly className="w-full px-4 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-xl font-bold text-emerald-900 outline-none cursor-not-allowed" value={companyForm.agreementDetails.annualIncrement} onChange={(e) => updateCompanySection('agreementDetails', 'annualIncrement', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Per Desk Meeting Credits</label>
                          <input type="number" min="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.agreementDetails.perDeskMeetingCredits} onChange={(e) => updateCompanySection('agreementDetails', 'perDeskMeetingCredits', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Meeting Credits</label>
                          <input type="number" min="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.agreementDetails.totalMeetingCredits} onChange={(e) => updateCompanySection('agreementDetails', 'totalMeetingCredits', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
                          <input type="date" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.agreementDetails.startDate} onChange={(e) => setCompanyForm((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                            agreementDetails: {
                              ...(prev.agreementDetails || {}),
                              startDate: e.target.value,
                            },
                          }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                          <input type="date" className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-xl font-bold text-slate-500 outline-none cursor-not-allowed" value={companyForm.agreementDetails.endDate} readOnly />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lock-in Period</label>
                          <input type="number" min="0" readOnly className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-xl font-bold text-slate-500 outline-none cursor-not-allowed" value={companyForm.agreementDetails.lockInPeriod} />
                        </div>

                      </div>
                    </div>
                  )}

                  {activeModal !== 'renew' && (
                    <div className="order-8 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">8. POC Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local POC Name</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.localPocName} onChange={(e) => updateCompanySection('pocDetails', 'localPocName', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local POC Email</label>
                          <input type="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.localPocEmail} onChange={(e) => updateCompanySection('pocDetails', 'localPocEmail', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local POC Phone</label>
                          <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-900 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={companyForm.pocDetails.localPocPhone} onChange={(e) => updateCompanySection('pocDetails', 'localPocPhone', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal !== 'renew' && (
                    <div className="order-2 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Briefcase size={14} />
                        2. Selected Package Details
                      </h3>
                      {isTenantPackageLocked && (
                        <p className="text-[10px] font-bold text-indigo-400">This package is locked to the company, so the package details stay read-only here.</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Package Name</label>
                          <input
                            type="text"
                            disabled={isTenantPackageLocked}
                            className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none focus:border-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                            value={companyForm.packageDetails.packageName}
                            onChange={(e) => updateCompanySection('packageDetails', 'packageName', e.target.value)}
                          />
                          {!companyForm.pricingPackageId && (
                            <p className="text-[10px] font-bold text-indigo-400">Name the custom package before you save the selected areas and desks.</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Total Seats</label>
                          <input
                            type="number"
                            min="0"
                            disabled
                            className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                            value={companyForm.packageDetails.totalSeats}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Open Desks</label>
                          <input
                            type="number"
                            min="0"
                            disabled
                            className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                            value={companyForm.packageDetails.openDesks}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Cabin Desks</label>
                          <input
                            type="number"
                            min="0"
                            disabled
                            className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                            value={companyForm.packageDetails.cabinDesks}
                          />
                        </div>
                        {Number(companyForm.packageDetails.openDesks || 0) > 0 && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Rate Per Open Desk</label>
                            <input
                              type="number"
                              min="0"
                              disabled={isTenantPackageLocked}
                              className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none focus:border-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                              value={companyForm.packageDetails.ratePerOpenDesk}
                              onChange={(e) => setCompanyForm((prev) => ({
                                ...prev,
                                packageDetails: {
                                  ...(prev.packageDetails || {}),
                                  ratePerOpenDesk: e.target.value,
                                },
                                companyDetails: {
                                  ...(prev.companyDetails || {}),
                                  ratePerOpenDesk: e.target.value,
                                },
                              }))}
                            />
                          </div>
                        )}
                        {Number(companyForm.packageDetails.cabinDesks || 0) > 0 && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Rate Per Cabin Desk</label>
                            <input
                              type="number"
                              min="0"
                              disabled={isTenantPackageLocked}
                              className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3.5 font-bold text-indigo-900 outline-none focus:border-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-100/60"
                              value={companyForm.packageDetails.ratePerCabinDesk}
                              onChange={(e) => setCompanyForm((prev) => ({
                                ...prev,
                                packageDetails: {
                                  ...(prev.packageDetails || {}),
                                  ratePerCabinDesk: e.target.value,
                                },
                                companyDetails: {
                                  ...(prev.companyDetails || {}),
                                  ratePerCabinDesk: e.target.value,
                                },
                              }))}
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Credits Per Seat</label>
                          <input
                            type="number"
                            min="0"
                            disabled={isTenantPackageLocked}
                            className="w-full rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3.5 font-bold text-sky-900 outline-none focus:border-sky-600 disabled:cursor-not-allowed disabled:bg-sky-100/60"
                            value={companyForm.packageDetails.creditsPerSeat}
                            onChange={(e) => setCompanyForm((prev) => syncCustomPackageCreditFields(prev, e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Monthly Total Credits</label>
                          <input
                            type="number"
                            min="0"
                            readOnly
                            className="w-full rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3.5 font-black text-sky-900 outline-none focus:border-sky-600"
                            value={companyForm.packageDetails.monthlyTotalCredits}
                          />
                        </div>
                        <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Selected Location Mapping</p>
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-700">
                              {locationLabelsFromValue(companyForm.packageDetails.locationMappings).length} selected
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {locationLabelsFromValue(companyForm.packageDetails.locationMappings).length > 0 ? (
                              locationLabelsFromValue(companyForm.packageDetails.locationMappings).map((label, index) => (
                                <span key={`${label}-${index}`} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                  {label}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-400">
                                {isCustomPackageSelected ? 'Choose a floor and wing to start selecting areas. Block mix only changes which sections are shown.' : 'Package locations will appear here.'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal !== 'renew' && (
                    <div className="order-9 space-y-4">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">9. Credit Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Credits Per Seat</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3.5 font-bold text-sky-900 outline-none focus:border-sky-600"
                            value={companyForm.packageDetails.creditsPerSeat}
                            onChange={(e) => setCompanyForm((prev) => syncCustomPackageCreditFields(prev, e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Monthly Total Credits</label>
                          <input
                            type="number"
                            min="0"
                            readOnly
                            className="w-full rounded-xl border-2 border-sky-100 bg-sky-50 px-4 py-3.5 font-black text-sky-900 outline-none focus:border-sky-600"
                            value={companyForm.packageDetails.monthlyTotalCredits}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Credit Reset Cycle</label>
                          <select disabled={isTenantPackageLocked} className="w-full px-4 py-3.5 bg-white border-2 border-sky-100 rounded-xl font-bold text-sky-900 focus:border-sky-600 outline-none cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:bg-sky-50" value={companyForm.creditConfiguration.creditResetCycle} onChange={(e) => {
                            updateCompanySection('creditConfiguration', 'creditResetCycle', e.target.value);
                            updateCompanySection('packageDetails', 'creditResetCycle', e.target.value);
                          }}>
                            <option>Monthly</option>
                            <option>Quarterly</option>
                            <option>Yearly</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Purchased Credits</label>
                          <input type="number" min="0" className="w-full px-4 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-xl font-bold text-emerald-900 focus:border-emerald-600 outline-none" value={companyForm.addOnCredits.purchasedCredits} onChange={(e) => updateCompanySection('addOnCredits', 'purchasedCredits', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Remaining Credits</label>
                          <input type="number" min="0" className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-semibold text-emerald-900 outline-none" value={calculateRemainingCredits(companyForm)} readOnly />
                        </div>
                        <div className="space-y-1 md:col-span-3">
                          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Credit Usage Tracking</label>
                          <textarea rows="3" disabled={isTenantPackageLocked} className="w-full px-4 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-xl font-medium text-emerald-900 focus:border-emerald-600 outline-none disabled:cursor-not-allowed disabled:bg-emerald-100/60" value={companyForm.creditConfiguration.creditUsageTracking} onChange={(e) => {
                            updateCompanySection('creditConfiguration', 'creditUsageTracking', e.target.value);
                            updateCompanySection('packageDetails', 'creditUsageTracking', e.target.value);
                          }} placeholder="Track monthly usage, add-on consumption, and renewal notes here." />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="order-1 space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5"><Briefcase size={14} /> 1. Package Selection & Allocation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest"> Select Package</label>
                        <select
                          className="w-full px-4 py-3.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-indigo-900 focus:border-indigo-600 outline-none cursor-pointer shadow-sm disabled:bg-indigo-50 disabled:text-indigo-500"
                          value={isCustomPackageSelected ? '__custom__' : (companyForm.pricingPackageId || '')}
                          onChange={e => handlePackageSelection(e.target.value)}
                          disabled={isTenantPackageLocked}
                        >
                          <option value="" disabled hidden>Select a package</option>
                          <option value="__custom__">Custom package</option>
                          {tenantPackageSelectionOptions.map((pkg) => <option key={pkg.recordId || pkg.id} value={pkg.recordId || pkg.id}>{pkg.name} - {pkg.creditsIncluded} CR{pkg.assignedTenantCompanyId ? ' - Locked' : ''}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">Credits Allocated (Auto)</label>
                        <input required type="number" min="0" disabled={Boolean(selectedTenantPackage)} className="w-full px-4 py-3.5 bg-white border-2 border-indigo-200 rounded-xl font-black text-indigo-700 outline-none disabled:bg-indigo-100/50 disabled:cursor-not-allowed" value={companyForm.creditsAllocated} onChange={e => setCompanyForm({ ...companyForm, creditsAllocated: parseInt(e.target.value) || 0, planType: 'Custom', pricingPackageId: '__custom__' })} />
                        <p className="text-[9px] font-bold text-indigo-400 mt-1">Credits used for meeting room bookings.</p>
                      </div>
                      {isCustomPackageSelected && (
                        <div className="md:col-span-2 space-y-3 rounded-xl border border-indigo-100 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700"><LayoutGrid size={10} /></div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Custom Package Builder</p>
                            </div>
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-700">
                              {customPackageSelectedResourceKeys.size} selected
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Floor</label>
                              <select
                                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[12px] font-bold text-indigo-900 outline-none"
                                value={customPackageFloor}
                                onChange={(e) => setCompanyForm((prev) => ({
                                  ...prev,
                                  packageDetails: {
                                    ...(prev.packageDetails || {}),
                                    selectionFloor: e.target.value,
                                    selectionWing: '',
                                  },
                                }))}
                              >
                                <option value="">Select floor</option>
                                {customPackageFloorOptions.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Wing</label>
                              <select
                                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[12px] font-bold text-indigo-900 outline-none"
                                value={customPackageWing}
                                onChange={(e) => setCompanyForm((prev) => ({
                                  ...prev,
                                  packageDetails: {
                                    ...(prev.packageDetails || {}),
                                    selectionWing: e.target.value.toUpperCase(),
                                  },
                                }))}
                              >
                                <option value="">Select wing</option>
                                {customPackageWingOptions.map((wing) => <option key={wing} value={wing}>{wing}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Block Mix</label>
                              <select
                                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[12px] font-bold text-indigo-900 outline-none"
                                value={customPackageBlockMix}
                                onChange={(e) => setCompanyForm((prev) => ({
                                  ...prev,
                                  packageDetails: {
                                    ...(prev.packageDetails || {}),
                                    selectionBlockMix: e.target.value,
                                  },
                                }))}
                              >
                                {tenantBlockMixOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </div>
                          </div>
                          {hasCustomPackageScopeSelection ? (
                            customPackageVisibleOpenAreaResources.length > 0 || customPackageVisibleCabinAreaResources.length > 0 || customPackageVisibleSingleOpenDeskResources.length > 0 ? (
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div className="rounded-xl border border-emerald-200 bg-white p-3">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><LayoutGrid size={10} /></div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Open Desk Blocks</p>
                                    </div>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                      {customPackageOpenSelectedCount}/{customPackageVisibleOpenAreaResources.length}
                                    </span>
                                  </div>
                                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                                    {customPackageVisibleOpenAreaResources.length > 0 ? customPackageVisibleOpenAreaResources.map((resource) => {
                                      const selected = customPackageSelectedResourceKeys.has(getTenantResourceSelectionKey(resource));
                                      const seatLabels = Array.isArray(resource.seatLabels) ? resource.seatLabels : [];
                                      return (
                                        <label key={resource.recordId || resource.resourceCode} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-all ${selected ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/50 hover:border-emerald-200'}`}>
                                          <input type="checkbox" disabled={isTenantPackageLocked} className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={selected} onChange={() => toggleLocationMapping(resource)} />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[12px] font-black text-slate-900">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{resource.capacity} seats - {formatCurrency(resource.pricePerDay)}/day - {Math.max(0, Number(resource.credits || 0))} cr/seat</p>
                                            {seatLabels.length > 0 && (
                                              <div className="mt-2 flex flex-wrap gap-1.5">
                                                {seatLabels.map((seatLabel) => (
                                                  <span key={`${resource.recordId || resource.resourceCode}-${seatLabel}`} className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                                    {seatLabel}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    }) : (
                                      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-4 text-center text-xs font-medium text-emerald-700">No open desk blocks in this scope.</div>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-blue-200 bg-white p-3">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-700"><LayoutGrid size={10} /></div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Cabin Desk Blocks</p>
                                    </div>
                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">
                                      {customPackageCabinSelectedCount}/{customPackageVisibleCabinAreaResources.length}
                                    </span>
                                  </div>
                                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                                    {customPackageVisibleCabinAreaResources.length > 0 ? customPackageVisibleCabinAreaResources.map((resource) => {
                                      const selected = customPackageSelectedResourceKeys.has(getTenantResourceSelectionKey(resource));
                                      const seatLabels = Array.isArray(resource.seatLabels) ? resource.seatLabels : [];
                                      return (
                                        <label key={resource.recordId || resource.resourceCode} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-all ${selected ? 'border-blue-300 bg-blue-50/70' : 'border-slate-100 bg-slate-50/50 hover:border-blue-200'}`}>
                                          <input type="checkbox" disabled={isTenantPackageLocked} className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={selected} onChange={() => toggleLocationMapping(resource)} />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[12px] font-black text-slate-900">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{resource.capacity} seats - {formatCurrency(resource.pricePerDay)}/day - {Math.max(0, Number(resource.credits || 0))} cr/seat</p>
                                            {seatLabels.length > 0 && (
                                              <div className="mt-2 flex flex-wrap gap-1.5">
                                                {seatLabels.map((seatLabel) => (
                                                  <span key={`${resource.recordId || resource.resourceCode}-${seatLabel}`} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">
                                                    {seatLabel}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    }) : (
                                      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-3 py-4 text-center text-xs font-medium text-blue-700">No cabin desk blocks in this scope.</div>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-sky-200 bg-white p-3">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-700"><LayoutGrid size={10} /></div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Single Open Desks</p>
                                    </div>
                                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sky-700">
                                      {customPackageVisibleSingleOpenDeskResources.length}
                                    </span>
                                  </div>
                                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                                    {customPackageVisibleSingleOpenDeskResources.length > 0 ? customPackageVisibleSingleOpenDeskResources.map((resource) => {
                                      const selected = customPackageSelectedResourceKeys.has(getTenantResourceSelectionKey(resource));
                                      return (
                                        <label key={resource.recordId || resource.resourceCode} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-all ${selected ? 'border-sky-300 bg-sky-50/70' : 'border-slate-100 bg-slate-50/50 hover:border-sky-200'}`}>
                                          <input type="checkbox" disabled={isTenantPackageLocked} className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500" checked={selected} onChange={() => toggleLocationMapping(resource)} />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[12px] font-black text-slate-900">{resource.name || resource.locationLabel || resource.resourceCode}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{resource.floor || '--'} / {resource.wing || '--'} - Single open desk</p>
                                          </div>
                                        </label>
                                      );
                                    }) : (
                                      <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-3 py-4 text-center text-xs font-medium text-sky-700">No single open desks in this scope.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                <LayoutGrid size={28} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-bold text-slate-500">No area blocks found</p>
                                <p className="mt-1 text-xs font-medium text-slate-400">Add open desk and cabin desk area blocks in Resource Management first.</p>
                              </div>
                            )
                          ) : (
                            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center">
                              <LayoutGrid size={28} className="mx-auto mb-2 text-indigo-300" />
                              <p className="text-sm font-bold text-indigo-600">Select floor and wing to load area blocks</p>
                              <p className="mt-1 text-xs font-medium text-indigo-400">The open desk and cabin desk cards will appear after both scope fields are set.</p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Selected Location Mapping</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {locationLabelsFromValue(companyForm.packageDetails.locationMappings).length > 0 ? (
                            locationLabelsFromValue(companyForm.packageDetails.locationMappings).map((label, index) => (
                              <span key={`${label}-${index}`} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-400">No location selected yet.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeModal !== 'renew' && (
                    <div className="order-10 space-y-4">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5"><FileText size={14} /> 10. Upload Document</h3>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest">Upload Agreement Document *</label>
                          <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/jpg"
                              onChange={handleAgreementFilesChange}
                              className="block w-full text-sm font-medium text-slate-700 border-none outline-none focus:ring-0 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-wider file:text-white hover:file:bg-amber-700"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                            {hasExistingAgreementDocuments
                              ? `${tenantAgreementDocuments.length} existing document${tenantAgreementDocuments.length === 1 ? '' : 's'} attached`
                              : 'One agreement document is required before saving.'}
                          </p>
                        </div>
                        {agreementFiles.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {agreementFiles.map((file) => (
                              <span key={`${file.name}-${file.lastModified}`} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {!hasExistingAgreementDocuments && agreementFiles.length === 0 && (
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                            Upload one agreement document to enable saving.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="order-11 sticky bottom-0 bg-white border-t border-slate-100 p-3 sm:p-4 flex gap-3">
                    <button type="button" onClick={() => { setActiveModal(null); setSelectedTenant(null); setCompanyForm(initialCompanyForm); setAgreementFiles([]); setFormError(''); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-200 transition-all">CANCEL</button>
                    <button type="submit" disabled={!canSaveTenantCompany || isSaving || billingSummary.hasValidationError || isContractDurationInvalid} className="flex-[2] py-2.5 bg-[#2563EB] text-white rounded-xl font-bold text-[11px] shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                      SUBMIT &amp; SEND TO FINANCE <Save size={14} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW MODAL — disabled; detail page used instead
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/70">
              
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-start shrink-0">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-sm font-black shadow-sm">
                      {getInitials(selectedTenant.companyName)}
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <h2 className="text-base font-pmedium text-primary">{selectedTenant.companyName}</h2>
                       {getStatusBadge(selectedTenant.status)}
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tenant ID: {selectedTenant.id}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                type="button"
                onClick={() => handleExportCompaniesReport('PDF')}
                disabled={Boolean(isExportingReport)}
                title="Export PDF"
                className="px-4 py-2.5 bg-white text-[#f10505] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown size={14} /> {isExportingReport === 'PDF' ? 'Exporting...' : ''}
                
              </button>
              <button
                type="button"
                onClick={() => handleExportCompaniesReport('Excel')}
                disabled={Boolean(isExportingReport)}
                title="Export Excel"
                className="px-4 py-2.5 bg-[#ffffff] text-[#1fd628] rounded-xl font-black text-[10px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSpreadsheet size={14} /> {isExportingReport === 'Excel' ? 'Exporting...' : ''}
                
              </button>
                   <button onClick={() => {setActiveModal(null); setSelectedTenant(null); setAgreementFiles([]);}} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 transition-all"><X size={16}/></button>
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
                        <p className="text-xs font-bold text-slate-900">{selectedTenant.contractStart || selectedTenant.agreementDetails?.startDate || 'N/A'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Contract End</p>
                        <p className="text-xs font-bold text-slate-900">{selectedTenant.contractEnd || selectedTenant.agreementDetails?.endDate || 'N/A'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-blue-500">Base Credits</p>
                        <p className="text-base font-black text-blue-600">{selectedTenant.packageDetails?.monthlyTotalCredits ?? selectedTenant.creditsTotal ?? selectedTenantBillingDisplay.credits ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-violet-500">Purchased</p>
                        <p className="text-base font-black text-violet-600">+{selectedTenantBillingDisplay.purchasedCredits ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-500">Credits Used</p>
                        <p className="text-base font-black text-emerald-600">{selectedTenantBillingDisplay.creditsUsed ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Credits Remaining</p>
                        <p className="text-base font-black text-slate-900">{formatInteger(selectedTenantBillingDisplay.creditsRemaining ?? 0)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Area</p>
                        <p className="text-xs font-bold text-slate-900">{selectedTenantArchitectureSnapshot.primaryFloor || selectedTenant.spaceAssigned?.area || 'Unassigned'}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Sales Package Summary</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Plan Type</p><p className="text-xs font-bold text-slate-900">{selectedTenant.packageName || selectedTenant.package || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Package Name</p><p className="text-xs font-bold text-slate-900">{selectedTenant.packageName || selectedTenant.packageDetails?.packageName || selectedTenant.package || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Location Blocks</p><p className="text-xs font-bold text-slate-900">{selectedTenant.packageLocationLabels?.length ? selectedTenant.packageLocationLabels.join(', ') : 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Total Seats</p><p className="text-xs font-bold text-slate-900">{formatInteger(selectedTenant.packageDetails?.totalSeats || 0)}</p></div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Billing Snapshot</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Monthly Rent</p><p className="text-xs font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.monthlyRent || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Total Contract Amount</p><p className="text-xs font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.totalContractAmount || selectedTenant.packagePrice || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Security Deposit</p><p className="text-xs font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.securityDepositAmount || 0)}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Deposit Status</p><p className="text-xs font-bold text-slate-900">{selectedTenant.billingDetails?.securityDepositPaidStatus || 'Pending'}</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Customer Profile</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Company Name</p><p className="text-xs font-bold text-slate-900">{selectedTenant.customerDetails?.clientName || selectedTenant.companyName}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Sector</p><p className="text-xs font-bold text-slate-900">{selectedTenant.customerDetails?.sector || selectedTenant.businessType || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO Country</p><p className="text-xs font-bold text-slate-900">{selectedTenant.customerDetails?.hoCountry || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO State</p><p className="text-xs font-bold text-slate-900">{selectedTenant.customerDetails?.hoState || 'N/A'}</p></div>
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">HO City</p><p className="text-xs font-bold text-slate-900">{selectedTenant.customerDetails?.hoCity || 'N/A'}</p></div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Manager Assignment</h3>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400">Current Manager</p>
                            <p className="text-xs font-bold text-slate-900">{selectedTenant.contactName || 'No manager assigned'}</p>
                            <p className="text-[10px] text-slate-500">{selectedTenant.email || 'Assign one manager from the employee list below.'}</p>
                          </div>
                          <span className="inline-flex w-max rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600">
                            {selectedTenant.contactName ? 'Manager Active' : 'Pending Assignment'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Company Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Building</p><p className="text-sm font-bold text-slate-900">{selectedTenant.companyDetails?.buildingName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Unit No.</p><p className="text-sm font-bold text-slate-900">{selectedTenant.companyDetails?.unitNo || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Open Desks</p><p className="text-sm font-bold text-slate-900">{selectedTenantBillingDisplay.openDeskCount || selectedTenant.companyDetails?.openDesks || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Cabin Desks</p><p className="text-sm font-bold text-slate-900">{selectedTenantBillingDisplay.cabinDeskCount || selectedTenant.companyDetails?.cabinDesks || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Open Desk Rate</p><p className="text-sm font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.ratePerOpenDesk || 0)}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Cabin Desk Rate</p><p className="text-sm font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.ratePerCabinDesk || 0)}</p></div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Package & Credits</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Plan Type</p><p className="text-sm font-bold text-slate-900">{selectedTenant.packageName || selectedTenant.package || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Package Name</p><p className="text-sm font-bold text-slate-900">{selectedTenant.packageDetails?.packageName || selectedTenant.packageName || selectedTenant.package || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Monthly Credits</p><p className="text-sm font-bold text-slate-900">{selectedTenant.packageDetails?.monthlyTotalCredits || selectedTenant.creditsTotal || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Credits / Seat</p><p className="text-sm font-bold text-slate-900">{selectedTenant.packageDetails?.creditsPerSeat || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Credit Reset</p><p className="text-sm font-bold text-slate-900">Monthly</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Usage Tracking</p><p className="text-sm font-bold text-slate-900">Per Booking</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">POC Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Name</p><p className="text-sm font-bold text-slate-900">{selectedTenant.pocDetails?.localPocName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Email</p><p className="text-sm font-bold text-slate-900 break-all">{selectedTenant.pocDetails?.localPocEmail || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Local POC Phone</p><p className="text-sm font-bold text-slate-900">{selectedTenant.pocDetails?.localPocPhone || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Name</p><p className="text-sm font-bold text-slate-900">{selectedTenant.pocDetails?.hoPocName || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Email</p><p className="text-sm font-bold text-slate-900 break-all">{selectedTenant.pocDetails?.hoPocEmail || 'N/A'}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">HO POC Phone</p><p className="text-sm font-bold text-slate-900">{selectedTenant.pocDetails?.hoPocPhone || 'N/A'}</p></div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-slate-900">Agreement Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Annual Increment</p><p className="text-sm font-bold text-slate-900">{formatCurrency(selectedTenantBillingDisplay.annualIncrement || selectedTenant.agreementDetails?.annualIncrement || 0)}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Meeting Credits</p><p className="text-sm font-bold text-slate-900">{selectedTenant.packageDetails?.monthlyTotalCredits || 0}</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Lock-in Period</p><p className="text-sm font-bold text-slate-900">{selectedTenant.agreementDetails?.lockInPeriod || selectedTenant.contractDurationMonths || 0} Months</p></div>
                          <div><p className="mb-1 text-xs font-bold text-slate-400">Status</p><p className="text-sm font-bold text-slate-900">{selectedTenant.status}</p></div>
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
                      {(selectedTenant.agreementDocuments || []).length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(selectedTenant.agreementDocuments || []).map((document) => (
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
                      <button onClick={() => setEmployeeModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100">
                        <Plus size={12} /> Add Employee
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Employee Directory</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-900">{normalizeTenantEmployees(selectedTenant.employees, selectedTenant.managerEmployeeId).length} managed {normalizeTenantEmployees(selectedTenant.employees, selectedTenant.managerEmployeeId).length === 1 ? 'employee' : 'employees'}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600"><Users size={11} /> Active roster</span>
                      </div>

                      {normalizeTenantEmployees(selectedTenant.employees, selectedTenant.managerEmployeeId).length > 0 ? (
                        <div className="grid gap-2">
                          {normalizeTenantEmployees(selectedTenant.employees, selectedTenant.managerEmployeeId).map((employee) => {
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
                                    <button onClick={() => setSelectedEmployee(employee)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">View Profile</button>
                                    {employee.status === 'Active' && !isManager && (
                                      <button onClick={() => handleAssignManager(employee.id)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100">Set Manager</button>
                                    )}
                                    {employee.status === 'Active' && isManager && (
                                      <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-700">Current Manager</span>
                                    )}
                                    {employee.status === 'Active' && (
                                      <button onClick={() => handleDeactivateEmployee(employee.id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-red-600 transition-colors hover:bg-red-100 hover:text-red-700">Deactivate</button>
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
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-500">Base Allocated</p><p className="text-base font-black text-slate-900">{selectedTenant.packageDetails?.monthlyTotalCredits ?? selectedTenant.creditsTotal ?? selectedTenantBillingDisplay.credits ?? 0}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-violet-500">Purchased Add-ons</p><p className="text-base font-black text-violet-600">+{selectedTenantBillingDisplay.purchasedCredits ?? 0}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-blue-500">Credits Used</p><p className="text-base font-black text-blue-600">{selectedTenantBillingDisplay.creditsUsed ?? 0}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-green-500">Remaining Balance</p><p className="text-base font-black text-green-600">{formatInteger(Math.max(0, (selectedTenantBillingDisplay.credits ?? 0) + (selectedTenantBillingDisplay.purchasedCredits ?? 0) - (selectedTenantBillingDisplay.creditsUsed ?? 0)))}</p></div>
                    </div>

                    {Array.isArray(selectedTenant.creditHistory) && selectedTenant.creditHistory.length > 0 && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Latest Credit Entry</p>
                            <h4 className="mt-0.5 text-sm font-black text-blue-950">{selectedTenant.creditHistory[0]?.roomName || selectedTenant.creditHistory[0]?.resource || selectedTenant.creditHistory[0]?.type || 'Meeting Room Booking'}</h4>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">{selectedTenant.creditHistory[0]?.bookingCode || 'No code'}</span>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-4 text-[10px] font-bold text-blue-900">
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Scheduled Date: {selectedTenant.creditHistory[0]?.scheduledDate || selectedTenant.creditHistory[0]?.date || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Booked By: {selectedTenant.creditHistory[0]?.bookedBy || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Schedule: {selectedTenant.creditHistory[0]?.startTime || '—'} - {selectedTenant.creditHistory[0]?.endTime || '—'}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Location: {selectedTenant.creditHistory[0]?.location || '—'}{selectedTenant.creditHistory[0]?.wing ? ` • Wing ${selectedTenant.creditHistory[0]?.wing}` : ''}</div>
                          <div className="rounded-xl bg-white px-2 py-1.5 border border-blue-100">Credits: {selectedTenant.creditHistory[0]?.credited || selectedTenant.creditHistory[0]?.debited || 0}</div>
                        </div>
                      </div>
                    )}

                    {Array.isArray(selectedTenant.creditHistory) && selectedTenant.creditHistory.length > 0 ? (
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
                            {selectedTenant.creditHistory.map((history) => (
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
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${history.status === 'Active' || history.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : history.status === 'Cancelled' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{history.status || 'Booked'}</span>
                                </td>
                                <td className={`px-3 py-2 text-right text-xs font-black ${Number(history.credited || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{Number(history.credited || 0) > 0 ? `+${history.credited}` : history.credited || history.debited || 0}</td>
                                <td className="px-3 py-2 text-right text-xs font-black text-emerald-600">{formatInteger(history.remainingCredits ?? selectedTenantBillingDisplay.creditsRemaining ?? 0)}</td>
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
                        <p className="px-2 text-xs font-bold text-slate-900">{selectedTenantArchitectureSnapshot.primaryFloor || selectedTenant.spaceAssigned?.area || 'Unassigned'}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Area</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <LayoutGrid className="mb-1 text-blue-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{selectedTenantBillingDisplay.openDeskCount ?? selectedTenant.spaceAssigned?.openDesks ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Open Desks</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <Building2 className="mb-1 text-purple-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{selectedTenantBillingDisplay.cabinDeskCount ?? selectedTenant.spaceAssigned?.cabinDesks ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Cabin Desks</p>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                        <Users className="mb-1 text-sky-500" size={18} />
                        <p className="text-2xl font-black text-slate-900">{selectedTenantBillingDisplay.totalSeats ?? selectedTenant.spaceAssigned?.totalSeats ?? 0}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Total Seats</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-900">Assigned Space Breakdown</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div><p className="mb-0.5 text-[10px] font-bold text-slate-400">Assigned Floor</p><p className="text-xs font-bold text-slate-900">{selectedTenantArchitectureSnapshot.primaryFloor || 'N/A'}</p></div>
                          <div>
                            <p className="mb-0.5 text-[10px] font-bold text-slate-400">Assigned Seats</p>
                            <div className="mt-0.5 flex flex-wrap gap-1.5">
                              {(selectedTenantSeatLabels.length > 0 ? selectedTenantSeatLabels : selectedTenantArchitectureSnapshot.assignedResources.map((r) => r.name || r.resourceCode || r.id).filter(Boolean)).length > 0 ? (selectedTenantSeatLabels.length > 0 ? selectedTenantSeatLabels : selectedTenantArchitectureSnapshot.assignedResources.map((r) => r.name || r.resourceCode || r.id).filter(Boolean)).map((seat) => (
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
                          {Array.isArray(selectedTenant.packageLocationLabels) && selectedTenant.packageLocationLabels.length > 0 ? selectedTenant.packageLocationLabels.map((label) => (
                            <span key={label} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</span>
                          )) : (
                            <span className="text-xs font-medium text-slate-400">No assigned location labels.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedTenantArchitectureSnapshot.assignedResources.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <h3 className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Assigned Seats by Area</h3>
                        <div className="space-y-3">
                          {selectedTenantArchitectureSnapshot.assignedAreaGroups.map((group) => (
                            <div key={`${group.label}-${group.floor}-${group.wing}`} className="rounded-xl border border-orange-100 bg-orange-50/50 p-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600">{group.label}</p>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-orange-700 shadow-sm">
                                  {formatInteger(group.seats.length || selectedTenantSeatLabels.length || selectedTenantBillingDisplay.totalSeats || 0)} seats
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(group.seats.length > 0 ? group.seats.map((r) => r.name || r.resourceCode || r.id).filter(Boolean) : selectedTenantSeatLabels).map((seatLabel) => (
                                  <span key={seatLabel} className="rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-bold text-orange-800 shadow-sm">{seatLabel}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {employeeModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-white/70">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                      <h3 className="text-sm font-black text-slate-900">Add Employee</h3>
                      <button onClick={() => { setEmployeeModalOpen(false); setEmployeeForm({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); }} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                    <form onSubmit={handleAddEmployee} className="p-4 space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</label>
                        <input type="text" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} required
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Employee name" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                        <input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="employee@company.com" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                        <input type="text" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Phone number" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                        <input type="text" value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Designation" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tenant Role</label>
                        <select value={employeeForm.role} onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100">
                          <option value="Employee">Employee</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => { setEmployeeModalOpen(false); setEmployeeForm({ name: '', email: '', phone: '', designation: '' }); }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isSaving}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                          {isSaving ? 'Adding...' : 'Add Employee'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {selectedEmployee && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
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
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tenant Link</p><p className="mt-0.5 text-xs font-bold text-slate-900">{selectedEmployee.tenantCompanyName || selectedTenant?.companyName || 'Tenant Company'}</p></div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white p-4">
                      <button onClick={() => { setEditingEmployee(selectedEmployee); setEmployeeEditForm({ name: selectedEmployee?.name || '', phone: selectedEmployee?.phone || '', designation: selectedEmployee?.designation || '', role: selectedEmployee?.role || 'Employee' }); }} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 transition-all hover:bg-blue-100">Edit</button>
                      <button onClick={() => { if (selectedEmployee?.status === 'Active') handleDeactivateEmployee(selectedEmployee.id); }}
                        disabled={selectedEmployee?.status !== 'Active'}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >Deactivate</button>
                      <button onClick={() => handleDeleteEmployee(selectedEmployee.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-100">Delete</button>
                      <button onClick={() => { setSelectedEmployee(null); setEditingEmployee(null); }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800">Close</button>
                    </div>
                  </div>
                </div>
              )}

              {editingEmployee && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
                  <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                      <h3 className="text-lg font-black text-slate-900">Edit Employee</h3>
                      <button onClick={() => { setEditingEmployee(null); setEmployeeEditForm({ name: '', phone: '', designation: '', role: 'Employee' }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleEmployeeEditSave} className="space-y-4 p-6">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Full Name</label>
                        <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.name} onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Phone (Optional)</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.phone} onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Designation</label>
                        <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.designation} onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, designation: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tenant Role</label>
                        <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none" value={employeeEditForm.role} onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, role: e.target.value })}>
                          <option value="Employee">Employee</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>
                      <button type="submit" disabled={isSaving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"><Save size={16} /> Save Employee</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        */}
        </PageFrame>
      </div>
    </>
  );
}
