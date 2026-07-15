import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createResource, getResources, updateResource } from '../../../services/resources';
import { createPricingPackage, deletePricingPackage, getPricingPackages, updatePricingPackage } from '../../../services/pricing-packages';
import { toast } from 'sonner';
import { AlertTriangle, Building2, CheckCircle2, ChevronDown, CreditCard, Download, Edit2, Eye, FileDown, FileSpreadsheet, LayoutGrid, Loader2, Monitor, Plus, Search, Save, Tag, Trash, UploadCloud, Users, X, XCircle } from 'lucide-react';
import { useFreshCurrentUser } from '../../../hooks/useFreshCurrentUser';
import { createReport } from '../../../services/reports';
import { downloadReportFile } from '../../../utils/report-download';
import PageFrame from '../../../components/Pages/PageFrame';
import { ResourcePricingSkeleton } from '../../../components/ui/SalesPageSkeletons';

const resourceStatusOptions = ['Active', 'Under Maintenance', 'Disabled'];
const packageStatusOptions = ['Active', 'Disabled'];
const resourceCategoryOptions = [
  { value: 'open_desk', label: 'Open Desk' },
  { value: 'cabin_desk', label: 'Cabin Desk' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'conference_room', label: 'Conference Room' },
  { value: 'virtual_office', label: 'Virtual Office' },
];
const inventoryModeOptions = [
  { value: 'area', label: 'Area Block' },
  { value: 'single', label: 'Single Desk' },
];
const TENANT_PACKAGE_MIN_DURATION_MONTHS = 3;
const TENANT_PACKAGE_MONTH_DAYS = 30;
const ADD_NEW_OPTION = '__add_new__';

const areaCapacityOptions = {
  open_desk: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  cabin_desk: [4, 6, 8, 10],
};

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '--';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', year: 'numeric' }).format(date);
}

function durationLabel(months = 0) {
  const value = Number(months || 0);
  if (value === 1) return '1 Month';
  if (value === 3) return '3 Months';
  if (value === 6) return '6 Months';
  if (value === 12) return '1 Year';
  if (value === 24) return '2 Years';
  return `${value} Months`;
}

function parseFeatures(text = '') {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function featuresToText(features = []) {
  return Array.isArray(features) ? features.join('\n') : '';
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some((entry) => hasMeaningfulValue(entry));
  return true;
}

function getTenantResourceLocation(resource = {}) {
  return [String(resource.floor || '').trim(), String(resource.wing || '').trim().toUpperCase()].filter(Boolean).join(' ').trim();
}

function getTenantResourceSelectionId(resource = {}) {
  return String(resource.recordId || resource.id || resource.resourceCode || '').trim();
}

function isTenantAreaBlockResource(resource = {}) {
  return (resource.resourceCategory === 'open_desk' || resource.resourceCategory === 'cabin_desk') && resource.inventoryMode === 'area';
}

function getTenantResourceSeatType(resource = {}) {
  if (resource.resourceCategory === 'open_desk') return 'open';
  if (resource.resourceCategory === 'cabin_desk') return 'cabin';
  return 'mixed';
}

function getTenantPackageScope(locationMappings = []) {
  const firstMapping = Array.isArray(locationMappings) ? locationMappings.find((mapping) => mapping?.floor || mapping?.wing) : null;

  if (!firstMapping) {
    return null;
  }

  return {
    floor: String(firstMapping.floor || '').trim(),
    wing: String(firstMapping.wing || '').trim().toUpperCase(),
  };
}

function getTenantScopeResources(resources = [], floor = '', wing = '') {
  return Array.isArray(resources)
    ? resources.filter((resource) => {
      const matchesFloor = floor ? resource.floor === floor : true;
      const matchesWing = wing ? String(resource.wing || '').trim().toUpperCase() === String(wing || '').trim().toUpperCase() : true;
      return matchesFloor && matchesWing;
    })
    : [];
}

function getTenantSelectedResourceIds(resources = [], locationMappings = []) {
  const mappings = Array.isArray(locationMappings) ? locationMappings.filter(Boolean) : [];
  if (mappings.length === 0) {
    return resources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  }

  const directCodes = new Set(
    mappings
      .flatMap((mapping) => [
        mapping.locationCode,
        mapping.label,
        mapping.resourceCode,
        mapping.id,
      ])
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean),
  );

  const matchedResources = resources.filter((resource) => {
    const resourceId = String(resource.recordId || resource.id || resource.resourceCode || '').trim().toUpperCase();
    const resourceLabel = String(resource.name || resource.label || '').trim().toUpperCase();
    const floorWing = String([resource.floor, resource.wing].filter(Boolean).join(' ')).trim().toUpperCase();

    return directCodes.has(resourceId)
      || directCodes.has(String(resource.resourceCode || '').trim().toUpperCase())
      || directCodes.has(resourceLabel)
      || directCodes.has(floorWing);
  });

  if (matchedResources.length > 0) {
    return matchedResources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  }

  const seatTypes = new Set(
    mappings
      .map((mapping) => String(mapping.seatType || '').trim().toLowerCase())
      .filter(Boolean),
  );

  if (seatTypes.has('open') || seatTypes.has('cabin')) {
    return resources
      .filter((resource) => {
        const resourceSeatType = getTenantResourceSeatType(resource);
        return seatTypes.has(resourceSeatType);
      })
      .map((resource) => getTenantResourceSelectionId(resource))
      .filter(Boolean);
  }

  return resources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
}

function getTenantPresetResourceIds(resources = [], preset = 'all') {
  const nextPreset = String(preset || 'all').toLowerCase();
  if (nextPreset === 'open') {
    return resources.filter((resource) => resource.resourceCategory === 'open_desk').map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  }

  if (nextPreset === 'cabin') {
    return resources.filter((resource) => resource.resourceCategory === 'cabin_desk').map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  }

  if (nextPreset === 'custom') {
    return [];
  }

  return resources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
}

function deriveTenantSelectionPreset(availableResources = [], selectedResourceIds = []) {
  const availableIds = availableResources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  const selectedSet = new Set(selectedResourceIds.map((value) => String(value || '').trim()).filter(Boolean));

  if (availableIds.length === 0 || selectedSet.size === 0) {
    return 'custom';
  }

  const openResources = availableResources.filter((resource) => resource.resourceCategory === 'open_desk');
  const cabinResources = availableResources.filter((resource) => resource.resourceCategory === 'cabin_desk');
  const openIds = openResources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);
  const cabinIds = cabinResources.map((resource) => getTenantResourceSelectionId(resource)).filter(Boolean);

  const allSelected = availableIds.length === selectedSet.size && availableIds.every((id) => selectedSet.has(id));
  if (allSelected) {
    return 'all';
  }

  const openOnlySelected = openIds.length > 0 && openIds.length === selectedSet.size && openIds.every((id) => selectedSet.has(id));
  if (openOnlySelected) {
    return 'open';
  }

  const cabinOnlySelected = cabinIds.length > 0 && cabinIds.length === selectedSet.size && cabinIds.every((id) => selectedSet.has(id));
  if (cabinOnlySelected) {
    return 'cabin';
  }

  return 'custom';
}

function getTenantSelectionPresetLabel(value = 'all') {
  if (value === 'open') return 'Open desks only';
  if (value === 'cabin') return 'Cabin desks only';
  if (value === 'custom') return 'Custom selection';
  return 'All available blocks';
}

function buildTenantPackageSummary(resources = [], durationMonths = TENANT_PACKAGE_MIN_DURATION_MONTHS, ratePerOpenDesk = 0, ratePerCabinDesk = 0) {
  const scopeResources = Array.isArray(resources) ? resources.filter(Boolean) : [];
  const totalSeats = scopeResources.reduce((sum, resource) => sum + Math.max(0, Number(resource.capacity || 0)), 0);
  const openDesks = scopeResources
    .filter((resource) => resource.resourceCategory === 'open_desk')
    .reduce((sum, resource) => sum + Math.max(0, Number(resource.capacity || 0)), 0);
  const cabinDesks = scopeResources
    .filter((resource) => resource.resourceCategory === 'cabin_desk')
    .reduce((sum, resource) => sum + Math.max(0, Number(resource.capacity || 0)), 0);
  const monthlyCredits = scopeResources.reduce(
    (sum, resource) => sum + (Math.max(0, Number(resource.capacity || 0)) * Math.max(0, Number(resource.credits || 0))),
    0,
  );
  const creditsPerSeat = totalSeats > 0 ? Math.round(monthlyCredits / totalSeats) : 0;
  const fallbackOpenDeskRate = scopeResources
    .filter((resource) => resource.resourceCategory === 'open_desk')
    .reduce((sum, resource, _index, list) => sum + Math.max(0, Number(resource.pricePerDay || 0)), 0);
  const fallbackCabinDeskRate = scopeResources
    .filter((resource) => resource.resourceCategory === 'cabin_desk')
    .reduce((sum, resource) => sum + Math.max(0, Number(resource.pricePerDay || 0)), 0);
  const resolvedRatePerOpenDesk = Math.max(0, Number(ratePerOpenDesk || 0)) || (openDesks > 0 ? Math.round(fallbackOpenDeskRate / Math.max(1, scopeResources.filter((resource) => resource.resourceCategory === 'open_desk').length)) : 0);
  const resolvedRatePerCabinDesk = Math.max(0, Number(ratePerCabinDesk || 0)) || (cabinDesks > 0 ? Math.round(fallbackCabinDeskRate / Math.max(1, scopeResources.filter((resource) => resource.resourceCategory === 'cabin_desk').length)) : 0);
  const dailyRateTotal = (openDesks * resolvedRatePerOpenDesk) + (cabinDesks * resolvedRatePerCabinDesk);
  const monthlyRate = dailyRateTotal * TENANT_PACKAGE_MONTH_DAYS;
  const contractMonths = Math.max(TENANT_PACKAGE_MIN_DURATION_MONTHS, Number(durationMonths || 0) || TENANT_PACKAGE_MIN_DURATION_MONTHS);
  const totalContractValue = monthlyRate * contractMonths;
  const locationMappings = scopeResources.map((resource) => ({
    floor: String(resource.floor || '').trim(),
    wing: String(resource.wing || '').trim().toUpperCase(),
    locationCode: String(resource.resourceCode || resource.id || resource.recordId || '').trim().toUpperCase().replace(/[\s_-]+/g, ''),
    label: getTenantResourceLocation(resource),
    seatType: getTenantResourceSeatType(resource),
    seatsAllocated: Math.max(0, Number(resource.capacity || 0)),
  }));

  return {
    totalSeats,
    openDesks,
    cabinDesks,
    monthlyCredits,
    creditsPerSeat,
    ratePerOpenDesk: resolvedRatePerOpenDesk,
    ratePerCabinDesk: resolvedRatePerCabinDesk,
    dailyRateTotal,
    monthlyRate,
    totalContractValue,
    locationMappings,
    scopeLabels: Array.from(new Set(scopeResources.map((resource) => getTenantResourceLocation(resource)).filter(Boolean))),
  };
}

function normalizeResource(resource = {}) {
  const floor = String(resource.floor || '').trim() || '';
  const wing = String(resource.wing || '').trim().toUpperCase();
  const locationArea = [floor, wing].filter(Boolean).join(' ').trim();
  return {
    ...resource,
    recordId: resource.recordId || resource._id || resource.id || resource.resourceCode,
    name: resource.name || '',
    type: resource.type || 'Meeting Room',
    resourceCode: resource.resourceCode || resource.id || '',
    resourceCategory: resource.resourceCategory || '',
    inventoryMode: resource.inventoryMode || 'area',
    floor,
    wing,
    location: String(resource.location || locationArea).trim(),
    locationLabel: [String(resource.location || '').trim(), locationArea].filter(Boolean).join(' \u2022 ').trim(),
    capacity: Number(resource.capacity || 1),
    pricePerHour: Number(resource.pricePerHour || 0),
    pricePerDay: Number(resource.pricePerDay || 0),
    credits: Number(resource.credits || 1),
    pricing: resource.pricing || '',
    pricingUpdatedAt: resource.pricingUpdatedAt || null,
    status: resource.status || 'Active',
  };
}

function isDeskCategory(category = '') {
  return category === 'open_desk' || category === 'cabin_desk' || category === 'virtual_office';
}

function deriveResourceTypeFromCategory(category = '') {
  if (!category) return '';
  if (category === 'open_desk') return 'Open Desk';
  if (category === 'cabin_desk') return 'Cabin Desk';
  if (category === 'conference_room') return 'Conference Room';
  if (category === 'virtual_office') return 'Virtual Office';
  return 'Meeting Room';
}

function getResourceCategoryLabel(value = '') {
  return resourceCategoryOptions.find((option) => option.value === value)?.label || 'Unassigned';
}

function getInventoryModeLabel(value = '') {
  return inventoryModeOptions.find((option) => option.value === value)?.label || 'Area Block';
}

function getResourceCreditModeLabel(resourceCategory = '', inventoryMode = 'area') {
  if (isDeskCategory(resourceCategory)) {
    return inventoryMode === 'single' ? 'Credit per desk' : 'Credit per seat';
  }

  return 'Hourly credit rate';
}

function getResourceCreditValue(resource = {}) {
  const capacity = Math.max(1, Number(resource.capacity || 1));
  const credits = Math.max(1, Number(resource.credits || 1));

  if (isDeskCategory(resource.resourceCategory) && resource.inventoryMode === 'area') {
    return capacity * credits;
  }

  return credits;
}

function getCapacityOptions(category = '', inventoryMode = 'area') {
  if (!isDeskCategory(category)) return [];
  if (category === 'virtual_office') return [1];
  if (category === 'cabin_desk') return areaCapacityOptions[category] || [];
  if (inventoryMode === 'single') return [1];
  return areaCapacityOptions[category] || [];
}

function normalizeCapacityForSelection(category = '', inventoryMode = 'area', capacity = '1') {
  const options = getCapacityOptions(category, inventoryMode);
  const parsedCapacity = Number(capacity || 1);
  if (options.length === 0) return String(Math.max(1, Math.trunc(parsedCapacity) || 1));
  if (options.includes(parsedCapacity)) return String(parsedCapacity);
  return String(options[0]);
}

function getResourceCreditSummary(resource = {}) {
  const capacity = Math.max(1, Number(resource.capacity || 1));
  const credits = Math.max(1, Number(resource.credits || 1));

  if (isDeskCategory(resource.resourceCategory)) {
    if (resource.inventoryMode === 'single') {
      return `${credits} credit${credits === 1 ? '' : 's'} for 1 fixed desk`;
    }

    const totalCredits = capacity * credits;
    return `${capacity} seats x ${credits} credit${credits === 1 ? '' : 's'} = ${totalCredits} credits`;
  }

  return `${credits} credit${credits === 1 ? '' : 's'} / hr`;
}

function normalizePackage(entry = {}) {
  const packageDetails = entry.packageDetails || {};
  const openDesks = Number(entry.openDesks || 0);
  const cabinDesks = Number(entry.cabinDesks || 0);
  const breakdownSeats = openDesks + cabinDesks;
  const totalSeats = breakdownSeats > 0 ? breakdownSeats : Number(entry.totalSeats || entry.seatsIncluded || 0);
  const creditsPerSeat = Math.round(Number(entry.creditsPerSeat || 0));
  const monthlyCredits = Math.round(Number(entry.monthlyCredits || entry.creditsIncluded || (totalSeats > 0 && creditsPerSeat > 0 ? totalSeats * creditsPerSeat : 0)));
  const ratePerOpenDesk = Number(entry.ratePerOpenDesk || packageDetails.ratePerOpenDesk || 0);
  const ratePerCabinDesk = Number(entry.ratePerCabinDesk || packageDetails.ratePerCabinDesk || 0);
  const dailyRateTotal = Number(entry.dailyRateTotal || packageDetails.dailyRateTotal || ((openDesks * ratePerOpenDesk) + (cabinDesks * ratePerCabinDesk)) || 0);
  const durationMonths = Number(entry.durationMonths || packageDetails.durationMonths || 1) || 1;
  const monthlyRent = Number(
    entry.monthlyRent
    || packageDetails.monthlyRent
    || (dailyRateTotal > 0 ? dailyRateTotal * TENANT_PACKAGE_MONTH_DAYS : 0)
    || (Number(entry.price || packageDetails.totalContractValue || packageDetails.price || 0) > 0 && durationMonths > 0
      ? Number(entry.price || packageDetails.totalContractValue || packageDetails.price || 0) / durationMonths
      : 0),
  );
  const totalContractValue = Number(
    entry.totalContractValue
    || entry.price
    || packageDetails.totalContractValue
    || packageDetails.price
    || (monthlyRent > 0 && durationMonths > 0 ? monthlyRent * durationMonths : 0),
  );
  const status = entry.isCustom && entry.category === 'Tenant'
    ? 'Active'
    : (entry.status || 'Active');
  return {
    ...entry,
    recordId: entry.recordId || entry._id || entry.id || entry.packageCode,
    name: entry.name || '',
    category: entry.category || 'Membership',
    creditsIncluded: Number(entry.creditsIncluded || 0),
    totalSeats,
    openDesks,
    cabinDesks,
    ratePerOpenDesk,
    ratePerCabinDesk,
    dailyRateTotal,
    monthlyRate: monthlyRent,
    monthlyRent,
    creditsPerSeat,
    monthlyCredits,
    price: totalContractValue,
    totalContractValue,
    durationMonths,
    seatsIncluded: Number(entry.seatsIncluded || 0),
    description: entry.description || '',
    features: Array.isArray(entry.features) ? entry.features : [],
    featuresText: featuresToText(entry.features),
    isRecommended: Boolean(entry.isRecommended),
    isCustom: Boolean(entry.isCustom),
    assignedTenantCompanyId: entry.assignedTenantCompanyId || null,
    assignedTenantCompanyName: entry.assignedTenantCompanyName || '',
    assignedAt: entry.assignedAt || null,
    locationMappings: Array.isArray(entry.locationMappings) ? entry.locationMappings : [],
    packageDetails: {
      ...packageDetails,
      ratePerOpenDesk,
      ratePerCabinDesk,
      dailyRateTotal,
      monthlyRent,
      totalContractValue,
      durationMonths,
    },
    status,
  };
}

function buildResourceExportRows(resource = {}) {
  return [
    { label: 'Resource Name', value: resource.name || '-' },
    { label: 'Resource Code', value: resource.resourceCode || resource.recordId || resource.id || '-' },
    { label: 'Category', value: getResourceCategoryLabel(resource.resourceCategory) },
    { label: 'Inventory Mode', value: isDeskCategory(resource.resourceCategory) ? getInventoryModeLabel(resource.inventoryMode) : 'Not applicable' },
    { label: 'Floor', value: resource.floor || '--' },
    { label: 'Wing', value: resource.wing || '--' },
    { label: 'Capacity', value: String(resource.capacity || 0) },
    { label: 'Price Per Hour', value: resource.pricePerHour ? formatCurrency(resource.pricePerHour) : '--' },
    { label: 'Price Per Day', value: resource.pricePerDay ? formatCurrency(resource.pricePerDay) : '--' },
    { label: 'Credits', value: String(getResourceCreditValue(resource)) },
    { label: 'Credit Summary', value: getResourceCreditSummary(resource) },
    { label: 'Status', value: resource.status || 'Active' },
    { label: 'Last Updated', value: formatDate(resource.pricingUpdatedAt || resource.updatedAt) },
  ];
}

function buildPackageExportRows(pkg = {}) {
  const isTenantPackage = pkg.category === 'Tenant';
  const locationMappings = Array.isArray(pkg.locationMappings) ? pkg.locationMappings : [];
  const locationLabels = Array.from(new Set(locationMappings.map((mapping) => getTenantResourceLocation(mapping)).filter(Boolean)));

  const rows = [
    { label: 'Package Name', value: pkg.name || '-' },
    { label: 'Category', value: pkg.category || '-' },
    { label: 'Package Code', value: pkg.packageCode || pkg.recordId || pkg.id || '-' },
    { label: 'Status', value: pkg.status || 'Active' },
    { label: 'Description', value: pkg.description || '--' },
    { label: 'Recommended', value: pkg.isRecommended ? 'Yes' : 'No' },
    { label: 'Duration', value: durationLabel(pkg.durationMonths) },
    { label: 'Contract Value', value: formatCurrency(pkg.price || pkg.totalContractValue || 0) },
    { label: 'Monthly Credits', value: String(pkg.monthlyCredits || pkg.creditsIncluded || 0) },
  ];

  if (isTenantPackage) {
    rows.push(
      { label: 'Floor', value: pkg.floor || '--' },
      { label: 'Wing', value: pkg.wing || '--' },
      { label: 'Open Desks', value: String(pkg.openDesks || 0) },
      { label: 'Cabin Desks', value: String(pkg.cabinDesks || 0) },
      { label: 'Total Seats', value: String(pkg.totalSeats || pkg.seatsIncluded || 0) },
      { label: 'Credits Per Seat', value: String(pkg.creditsPerSeat || 0) },
      { label: 'Open Desk Rate / Day', value: pkg.ratePerOpenDesk ? formatCurrency(pkg.ratePerOpenDesk) : '--' },
      { label: 'Cabin Desk Rate / Day', value: pkg.ratePerCabinDesk ? formatCurrency(pkg.ratePerCabinDesk) : '--' },
      { label: 'Monthly Rent', value: formatCurrency(pkg.monthlyRate || pkg.monthlyRent || 0) },
      { label: 'Total Contract Value', value: formatCurrency(pkg.totalContractValue || pkg.price || 0) },
      { label: 'Selected Blocks', value: locationLabels.length > 0 ? locationLabels.join(', ') : 'Unassigned' },
      { label: 'Assigned Tenant Company', value: pkg.assignedTenantCompanyName || 'Unassigned' },
    );
  }

  const features = Array.isArray(pkg.features) && pkg.features.length > 0 ? pkg.features : parseFeatures(pkg.featuresText);
  features.slice(0, 20).forEach((feature, index) => {
    rows.push({
      label: `Feature ${index + 1}`,
      value: feature,
    });
  });

  return rows;
}

function buildPackagesExportRows(items = [], scopeLabel = 'Packages', filters = {}) {
  const rows = [
    { label: 'Total Items', value: String(items.length || 0) },
    { label: 'Scope', value: scopeLabel },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];

  items.forEach((item, index) => {
    rows.push({
      label: `${index + 1}. ${item.name || 'Package'}`,
      value: [
        item.category ? `Category: ${item.category}` : '',
        item.status ? `Status: ${item.status}` : '',
        item.durationMonths ? `Duration: ${durationLabel(item.durationMonths)}` : '',
        item.category === 'Tenant' ? `Contract: ${formatCurrency(item.price || 0)}` : `Price: ${formatCurrency(item.price || 0)}`,
        item.category === 'Tenant' ? `Monthly Credits: ${item.monthlyCredits || item.creditsIncluded || 0}` : `Credits: ${item.creditsIncluded || 0}`,
      ].filter(Boolean).join(' | '),
    });
  });

  return rows;
}

function buildResourcesExportRows(items = [], scopeLabel = 'Resources', filters = {}) {
  const rows = [
    { label: 'Total Items', value: String(items.length || 0) },
    { label: 'Scope', value: scopeLabel },
    { label: 'Search Filter', value: filters.searchQuery || 'All' },
  ];

  items.forEach((item, index) => {
    rows.push({
      label: `${index + 1}. ${item.name || 'Resource'}`,
      value: [
        item.resourceCode ? `Code: ${item.resourceCode}` : '',
        item.resourceCategory ? `Category: ${getResourceCategoryLabel(item.resourceCategory)}` : '',
        item.inventoryMode && isDeskCategory(item.resourceCategory) ? `Inventory: ${getInventoryModeLabel(item.inventoryMode)}` : '',
        item.floor ? `Floor: ${item.floor}` : '',
        item.wing ? `Wing: ${item.wing}` : '',
        item.pricePerHour > 0 ? `Hourly: ${formatCurrency(item.pricePerHour)}` : '',
        item.pricePerDay > 0 ? `Daily: ${formatCurrency(item.pricePerDay)}` : '',
        `Credits: ${getResourceCreditValue(item)}`,
      ].filter(Boolean).join(' | '),
    });
  });

  return rows;
}

function statusBadge(status) {
  if (status === 'Active') return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider"><CheckCircle2 size={12} /> Active</span>;
  if (status === 'Under Maintenance') return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider"><AlertTriangle size={12} /> Maintenance</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider"><XCircle size={12} /> Disabled</span>;
}

const RESOURCE_FULL_DAY_HOURS = 24;

function formatAutoPriceValue(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }

  const rounded = Math.round(numeric * 100) / 100;
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
}

export default function PricingPackagesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState('');
  const [activeTab, setActiveTab] = useState('resource');
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('All Categories');
  const [resourceFloorFilter, setResourceFloorFilter] = useState('All Floors');
  const [resourceWingFilter, setResourceWingFilter] = useState('All Wings');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('All Status');
  const [packageStatusFilter, setPackageStatusFilter] = useState('All Status');
  const [resources, setResources] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState('package');
  const [modalMode, setModalMode] = useState('add');
  const [selectedItem, setSelectedItem] = useState(null);
  const [resourceForm, setResourceForm] = useState({ name: '', type: '', resourceCategory: '', inventoryMode: '', location: '', floor: '', wing: '', capacity: '1', description: '', pricePerHour: '', pricePerDay: '', credits: '', status: 'Active' });
  const [addResourceForm, setAddResourceForm] = useState({
    name: '', type: '', resourceCategory: '', inventoryMode: '', location: '', floor: '', wing: '', capacity: '1',
    pricePerHour: '', pricePerDay: '', credits: '1', status: 'Active', description: '',
  });
  const [packageForm, setPackageForm] = useState({
    category: 'Membership',
    name: '',
    creditsIncluded: '',
    price: '',
    durationMonths: '12',
    floor: '',
    wing: '',
    selectedResourceIds: [],
    seatsIncluded: '0',
    totalSeats: '0',
    openDesks: '0',
    cabinDesks: '0',
    ratePerOpenDesk: '',
    ratePerCabinDesk: '',
    creditsPerSeat: '0',
    monthlyCredits: '0',
    description: '',
    featuresText: '',
    isRecommended: false,
    status: 'Active',
  });
  const bulkUploadInputRef = useRef(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isTemplateInfoOpen, setIsTemplateInfoOpen] = useState(false);
  const [isAllowedValuesOpen, setIsAllowedValuesOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkUploadSummary, setBulkUploadSummary] = useState(null);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [locationMode, setLocationMode] = useState('select');
  const [floorMode, setFloorMode] = useState('select');
  const [wingMode, setWingMode] = useState('select');
  const currentUser = useFreshCurrentUser();
  const navigate = useNavigate();

  const currentUserName = useMemo(
    () => currentUser?.fullName || currentUser?.name || currentUser?.displayName || 'Sales Manager',
    [currentUser],
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([getResources(), getPricingPackages()])
      .then(([resourceResponse, packageResponse]) => {
        if (!mounted) return;
        setResources((resourceResponse?.data?.data?.resources || resourceResponse?.data?.resources || []).map(normalizeResource));
        setPackages((packageResponse?.data?.data?.packages || packageResponse?.data?.packages || []).map(normalizePackage));
      })
      .catch((error) => {
        if (mounted) {
          toast.error(error.message || 'Unable to load pricing data.');
          setResources([]);
          setPackages([]);
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const membershipPackages = useMemo(() => packages.filter((entry) => entry.category === 'Membership'), [packages]);
  const tenantPackages = useMemo(() => packages.filter((entry) => entry.category === 'Tenant'), [packages]);
  const activePackages = activeTab === 'membership' ? membershipPackages : tenantPackages;
  const isViewingPackage = modalKind === 'package' && modalMode === 'view';
  const isViewingResource = modalKind === 'resource' && modalMode === 'view';
  const availableResourceLocations = useMemo(() => {
    return Array.from(new Set(resources.map((item) => String(item.location || '').trim()).filter(Boolean)));
  }, [resources]);
  const availableResourceFloors = useMemo(() => {
    const floors = Array.from(new Set(resources.map((item) => String(item.floor || '').trim()).filter(Boolean)));
    return floors.length > 0 ? floors : [];
  }, [resources]);
  const availableResourceWings = useMemo(() => {
    const wings = Array.from(new Set(resources.map((item) => String(item.wing || '').trim().toUpperCase()).filter(Boolean)));
    return wings.sort();
  }, [resources]);
  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return resources
      .filter((item) => {
        const locationLabel = item.locationLabel || [item.floor, item.wing].filter(Boolean).join(' ').trim();
        const matchesQuery = !query || [
          item.name,
          item.type,
          item.resourceCode,
          item.resourceCategory,
          item.inventoryMode,
          item.floor,
          item.wing,
          locationLabel,
        ].filter(Boolean).some((value) => value.toLowerCase().includes(query));
        const matchesCategory = resourceCategoryFilter === 'All Categories' || item.resourceCategory === resourceCategoryFilter;
        const matchesFloor = resourceFloorFilter === 'All Floors' || String(item.floor || '').trim() === resourceFloorFilter;
        const matchesWing = resourceWingFilter === 'All Wings' || String(item.wing || '').trim().toUpperCase() === resourceWingFilter;
        const matchesStatus = resourceStatusFilter === 'All Status' || item.status === resourceStatusFilter;

        return matchesQuery && matchesCategory && matchesFloor && matchesWing && matchesStatus;
      })
      .sort((a, b) => {
        const aActive = a.isActive || a.status === 'Active' ? 1 : 0;
        const bActive = b.isActive || b.status === 'Active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
  }, [resources, searchQuery, resourceCategoryFilter, resourceFloorFilter, resourceWingFilter, resourceStatusFilter]);
  const filteredPackages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activePackages.filter((item) => {
      const matchesStatus = packageStatusFilter === 'All Status' || (item.status || 'Active') === packageStatusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [item.name, item.description, item.packageCode].filter(Boolean).some((value) => value.toLowerCase().includes(query));
    });
  }, [activePackages, searchQuery, packageStatusFilter]);

  const tenantAreaResources = useMemo(
    () => {
      return resources.filter((resource) => {
        const isAreaBlock = isTenantAreaBlockResource(resource);
        const isUnassigned = !resource.assignedTenantCompanyId && !resource.assignedDepartmentId;
        const isEnabled = resource.isActive && Number(resource.pricePerDay) > 0 && Number(resource.credits) > 0;
        return isAreaBlock && isUnassigned && isEnabled;
      });
    },
    [resources],
  );

  const tenantFloorOptions = useMemo(() => {
    const floors = Array.from(new Set(tenantAreaResources.map((resource) => resource.floor).filter(Boolean)));
    return floors.length > 0 ? floors.sort((left, right) => left.localeCompare(right, undefined, { numeric: true })) : [];
  }, [tenantAreaResources]);

  const tenantWingOptions = useMemo(() => {
    const wings = Array.from(new Set(
      tenantAreaResources
        .filter((resource) => !packageForm.floor || resource.floor === packageForm.floor)
        .map((resource) => String(resource.wing || '').trim().toUpperCase())
        .filter(Boolean),
    ));
    return wings.length > 0 ? wings.sort() : [];
  }, [packageForm.floor, tenantAreaResources]);

  const tenantPackageScopeResources = useMemo(() => {
    if (packageForm.category !== 'Tenant') {
      return [];
    }

    return getTenantScopeResources(tenantAreaResources, packageForm.floor, packageForm.wing);
  }, [packageForm.category, packageForm.floor, packageForm.wing, tenantAreaResources]);

  const tenantOpenDeskResources = useMemo(
    () => tenantPackageScopeResources.filter((resource) => resource.resourceCategory === 'open_desk'),
    [tenantPackageScopeResources],
  );

  const tenantCabinDeskResources = useMemo(
    () => tenantPackageScopeResources.filter((resource) => resource.resourceCategory === 'cabin_desk'),
    [tenantPackageScopeResources],
  );

  const tenantPackageSelectedResources = useMemo(() => {
    if (packageForm.category !== 'Tenant') {
      return [];
    }

    const selectedIds = new Set((packageForm.selectedResourceIds || []).map((value) => String(value || '').trim()).filter(Boolean));
    return tenantPackageScopeResources.filter((resource) => selectedIds.has(getTenantResourceSelectionId(resource)));
  }, [packageForm.category, packageForm.selectedResourceIds, tenantPackageScopeResources]);

  const tenantSelectionPreset = useMemo(
    () => deriveTenantSelectionPreset(tenantPackageScopeResources, packageForm.selectedResourceIds || []),
    [packageForm.selectedResourceIds, tenantPackageScopeResources],
  );

  const tenantPackageSummary = useMemo(
    () => buildTenantPackageSummary(tenantPackageSelectedResources, packageForm.durationMonths, packageForm.ratePerOpenDesk, packageForm.ratePerCabinDesk),
    [packageForm.durationMonths, packageForm.ratePerOpenDesk, packageForm.ratePerCabinDesk, tenantPackageSelectedResources],
  );

  const computedMonthlyCredits = useMemo(() => {
    if (packageForm.category !== 'Tenant') {
      return Number(packageForm.creditsIncluded || 0);
    }

    return tenantPackageSummary.monthlyCredits;
  }, [packageForm.category, packageForm.creditsIncluded, tenantPackageSummary.monthlyCredits]);

  const computedTotalSeats = useMemo(() => {
    if (packageForm.category === 'Tenant') {
      return tenantPackageSummary.totalSeats;
    }

    const breakdownTotal = Number(packageForm.openDesks || 0) + Number(packageForm.cabinDesks || 0);
    const explicit = Number(packageForm.totalSeats || 0);
    if (explicit > 0) return explicit;
    return breakdownTotal;
  }, [packageForm.category, packageForm.totalSeats, packageForm.openDesks, packageForm.cabinDesks, tenantPackageSummary.totalSeats]);

  const selectedPackage = selectedItem || {};
  const selectedPackageSnapshot = selectedPackage.pricingPackageSnapshot || {};
  const selectedPackageCompanyDetails = selectedPackage.companyDetails || {};
  const selectedPackageBillingDetails = selectedPackage.billingDetails || {};
  const viewPackageCategory = selectedPackage.category || packageForm.category;
  const isTenantPackageRateEdit = modalKind === 'package' && modalMode === 'edit' && packageForm.category === 'Tenant';
  const viewPackageDurationMonths = Math.max(
    viewPackageCategory === 'Tenant' ? TENANT_PACKAGE_MIN_DURATION_MONTHS : 1,
    Number(selectedPackage.durationMonths || selectedPackage.packageDetails?.durationMonths || packageForm.durationMonths || 0) || (viewPackageCategory === 'Tenant' ? TENANT_PACKAGE_MIN_DURATION_MONTHS : 1),
  );
  const viewPackageRatePerOpenDesk = Number(selectedPackageSnapshot.ratePerOpenDesk || selectedPackageCompanyDetails.ratePerOpenDesk || selectedPackage.ratePerOpenDesk || selectedPackage.packageDetails?.ratePerOpenDesk || packageForm.ratePerOpenDesk || 0);
  const viewPackageRatePerCabinDesk = Number(selectedPackageSnapshot.ratePerCabinDesk || selectedPackageCompanyDetails.ratePerCabinDesk || selectedPackage.ratePerCabinDesk || selectedPackage.packageDetails?.ratePerCabinDesk || packageForm.ratePerCabinDesk || 0);
  const viewPackagePrice = Number(selectedPackage.price || packageForm.price || 0);
  const viewPackageDailyRateTotal = viewPackageCategory === 'Tenant'
    ? (Number(selectedPackage.dailyRateTotal || 0)
      || ((Number(selectedPackageSnapshot.openDesks || selectedPackageCompanyDetails.openDesks || selectedPackage.openDesks || selectedPackage.packageDetails?.openDesks || 0) * viewPackageRatePerOpenDesk)
        + (Number(selectedPackageSnapshot.cabinDesks || selectedPackageCompanyDetails.cabinDesks || selectedPackage.cabinDesks || selectedPackage.packageDetails?.cabinDesks || 0) * viewPackageRatePerCabinDesk)))
    : Number(selectedPackage.dailyRateTotal || 0);
  const viewPackageMonthlyRate = viewPackageCategory === 'Tenant'
    ? (viewPackagePrice > 0 && viewPackageDurationMonths > 0
      ? Math.round(viewPackagePrice / viewPackageDurationMonths)
      : Number(selectedPackageBillingDetails.monthlyRent || selectedPackageSnapshot.monthlyRent || selectedPackage.monthlyRate || selectedPackage.monthlyRent || 0)
      || (viewPackageDailyRateTotal * TENANT_PACKAGE_MONTH_DAYS))
    : (Number(selectedPackageBillingDetails.monthlyRent || selectedPackage.monthlyRate || selectedPackage.monthlyRent || 0));
  const viewPackageTotalContractValue = Number(selectedPackageBillingDetails.totalContractAmount || selectedPackageSnapshot.totalContractValue || selectedPackage.totalContractValue || selectedPackage.price || selectedPackage.packageDetails?.totalContractValue || 0)
    || (viewPackageCategory === 'Tenant' && viewPackageMonthlyRate > 0 && viewPackageDurationMonths > 0
      ? viewPackageMonthlyRate * viewPackageDurationMonths
      : 0);
  const viewPackageTotalSeats = Number(selectedPackageSnapshot.openDesks || selectedPackageSnapshot.cabinDesks)
    ? Number(selectedPackageSnapshot.openDesks || 0) + Number(selectedPackageSnapshot.cabinDesks || 0)
    : Number(selectedPackage.totalSeats || selectedPackage.packageDetails?.totalSeats || selectedPackage.seatsIncluded || computedTotalSeats || 0);
  const viewPackageOpenDesks = Number(selectedPackageSnapshot.openDesks || selectedPackageCompanyDetails.openDesks || selectedPackage.openDesks || selectedPackage.packageDetails?.openDesks || 0);
  const viewPackageCabinDesks = Number(selectedPackageSnapshot.cabinDesks || selectedPackageCompanyDetails.cabinDesks || selectedPackage.cabinDesks || selectedPackage.packageDetails?.cabinDesks || 0);
  const viewPackageCreditsPerSeat = Number(selectedPackage.creditsPerSeat || selectedPackage.packageDetails?.creditsPerSeat || 0);
  const viewPackageMonthlyCredits = Number(selectedPackage.monthlyCredits || selectedPackage.packageDetails?.monthlyTotalCredits || selectedPackage.creditsIncluded || 0);
  const viewPackageLocationMappings = Array.isArray(selectedPackage.locationMappings) && selectedPackage.locationMappings.length > 0
    ? selectedPackage.locationMappings
    : Array.isArray(selectedPackage.packageDetails?.locationMappings)
      ? selectedPackage.packageDetails.locationMappings
      : [];
  const viewPackageFeatures = Array.isArray(selectedPackage.features) ? selectedPackage.features : parseFeatures(selectedPackage.featuresText);

  const openAddResourceModal = () => {
    setModalKind('resource');
    setModalMode('add');
    setSelectedItem(null);
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
    setAddResourceForm({
      name: '', type: '', resourceCategory: 'open_desk', inventoryMode: 'area', location: '', floor: '', wing: '', capacity: '1',
      pricePerHour: '', pricePerDay: '', credits: '1', status: 'Active', description: '',
    });
    setIsModalOpen(true);
  };

  const BULK_TEMPLATE_HEADERS = [
    'name', 'resourceCategory', 'inventoryMode', 'location', 'floor', 'wing', 'capacity',
    'pricePerHour', 'pricePerDay', 'credits', 'description', 'status',
  ];

  const BULK_COLUMN_ALIASES = {
    name: ['name', 'resource name', 'resource', 'label'],
    resourceCategory: ['resourcecategory', 'resource category', 'category', 'resource type'],
    type: ['type'],
    inventoryMode: ['inventorymode', 'inventory mode', 'inventory', 'mode'],
    location: ['location', 'site', 'area'],
    floor: ['floor', 'level'],
    wing: ['wing', 'block', 'section'],
    capacity: ['capacity', 'seats', 'seat count', 'pax'],
    pricePerHour: ['priceperhour', 'price per hour', 'hourly rate', 'hourly', 'per hour rate'],
    pricePerDay: ['priceperday', 'price per day', 'daily rate', 'daily', 'per day rate'],
    credits: ['credits', 'credit', 'credit points'],
    description: ['description', 'amenities', 'notes'],
    status: ['status', 'state'],
  };

  function normalizeBulkHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function resolveBulkCellValue(row, aliases = []) {
    const entries = Object.entries(row || {});
    const normalizedEntries = entries.map(([key, value]) => [normalizeBulkHeader(key), value]);
    for (const alias of aliases) {
      const normalizedAlias = normalizeBulkHeader(alias);
      const match = normalizedEntries.find(([key]) => key === normalizedAlias);
      if (match && String(match[1] ?? '').trim()) return String(match[1]);
    }
    return '';
  }

  function normalizeBulkCategory(value = '', fallback = '') {
    const normalized = String(value || fallback || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('open') || normalized === 'desk') return 'open_desk';
    if (normalized.includes('cabin')) return 'cabin_desk';
    if (normalized.includes('conference') || normalized.includes('board')) return 'conference_room';
    if (normalized.includes('meeting')) return 'meeting_room';
    if (normalized.includes('virtual')) return 'virtual_office';
    const allowed = resourceCategoryOptions.map((opt) => opt.value);
    return allowed.includes(normalized) ? normalized : '';
  }

  function normalizeBulkInventoryMode(value = '', category = '', capacity = 1) {
    const normalized = String(value || '').trim().toLowerCase();
    const normalizedCategory = normalizeBulkCategory(category);
    if (normalizedCategory === 'virtual_office') return 'single';
    if (normalizedCategory === 'cabin_desk') return 'area';
    if (normalized === 'area' || normalized === 'single') return normalized;
    const seatCount = Number(capacity || 0);
    if (normalizedCategory === 'open_desk') return seatCount > 1 ? 'area' : 'single';
    return 'area';
  }

  function normalizeBulkWing(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.toUpperCase().replace(/^WING\s+/i, '');
  }

  function normalizeBulkStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    const status = resourceStatusOptions.find((opt) => opt.toLowerCase() === normalized);
    return status || 'Active';
  }

  function normalizeBulkCapacity(value) {
    const numericValue = typeof value === 'number' ? value : Number.parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
  }

  function isBulkRowEmpty(row = {}) {
    return !Object.values(row).some((value) => String(value ?? '').trim());
  }

  function buildBulkResourcePayload(row) {
    const name = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.name)).trim();
    if (!name) return { payload: null, error: 'Missing resource name.' };
    const rawCategory = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.resourceCategory);
    const rawType = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.type);
    const resourceCategory = normalizeBulkCategory(rawCategory, rawType);
    if (!resourceCategory) return { payload: null, error: 'Missing or invalid resource category.' };
    const capacityValue = normalizeBulkCapacity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.capacity));
    if (!capacityValue) return { payload: null, error: 'Missing or invalid capacity.' };
    const inventoryMode = normalizeBulkInventoryMode(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.inventoryMode), resourceCategory, capacityValue);
    const rawInventoryMode = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.inventoryMode)).trim().toLowerCase();
    if (resourceCategory === 'cabin_desk' && rawInventoryMode.includes('single')) {
      return { payload: null, error: 'Cabin desks can only be imported as area blocks.' };
    }
    const rawWing = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.wing);
    const wing = normalizeBulkWing(rawWing);
    const location = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.location)).trim();
    const floorValue = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.floor)).trim();
    const description = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.description)).trim();
    if (!location) return { payload: null, error: 'Missing location.' };
    const rawPricePerHour = normalizeBulkCapacity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.pricePerHour));
    const rawPricePerDay = normalizeBulkCapacity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.pricePerDay));
    const rawCredits = normalizeBulkCapacity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.credits));
    return {
      payload: {
        name,
        type: resourceCategory === 'open_desk' ? 'Open Desk' : resourceCategory === 'cabin_desk' ? 'Cabin Desk' : resourceCategory === 'conference_room' ? 'Conference Room' : resourceCategory === 'virtual_office' ? 'Virtual Office' : 'Meeting Room',
        resourceCategory,
        inventoryMode: resourceCategory === 'virtual_office' ? 'single' : inventoryMode,
        location,
        floor: floorValue,
        wing,
        capacity: resourceCategory === 'virtual_office' ? 1 : capacityValue,
        pricePerHour: rawPricePerHour,
        pricePerDay: rawPricePerDay,
        credits: Math.max(1, rawCredits || 1),
        description,
        status: normalizeBulkStatus(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.status)),
      },
    };
  }

  async function readSpreadsheetRows(file) {
    const XLSX = await import('xlsx');
    const name = String(file?.name || '').toLowerCase();
    const isCsv = name.endsWith('.csv');
    const workbook = isCsv
      ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
      : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  async function handleBulkFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsBulkUploadOpen(false);
    setErrorMessage('');
    setIsBulkImporting(true);
    setBulkUploadSummary(null);
    setBulkUploadFileName(file.name);
    try {
      const rows = await readSpreadsheetRows(file);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('The file does not contain any resource rows.');
      const importRows = rows.map((row, index) => ({ row, index: index + 2 })).filter(({ row }) => !isBulkRowEmpty(row));
      if (importRows.length === 0) throw new Error('No valid resource rows were found.');
      let createdCount = 0;
      const failedRows = [];
      for (const { row, index } of importRows) {
        const { payload, error } = buildBulkResourcePayload(row);
        if (!payload) { failedRows.push(`Row ${index}: ${error || 'invalid row.'}`); continue; }
        try {
          const response = await createResource(payload);
          const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
          if (saved?.recordId) { setResources((current) => [saved, ...current]); createdCount += 1; }
          else { failedRows.push(`Row ${index}: resource was not returned by the server.`); }
        } catch { failedRows.push(`Row ${index}: failed to import.`); }
      }
      setBulkUploadSummary({ fileName: file.name, totalRows: rows.length, processedRows: importRows.length, createdCount, failedCount: failedRows.length, failedRows: failedRows.slice(0, 5) });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to import resources right now.');
    } finally { setIsBulkImporting(false); }
  }

  async function downloadBulkTemplate() {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const templateRow = Object.fromEntries(BULK_TEMPLATE_HEADERS.map((h) => [h, '']));
    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resources');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resourceCategoryOptions.map((opt) => ({ Category: opt.value, Label: opt.label }))), 'Allowed Categories');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inventoryModeOptions.map((opt) => ({ InventoryMode: opt.value, Label: opt.label }))), 'Allowed Inventory Modes');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resourceStatusOptions.map((s) => ({ 'Allowed Status': s }))), 'Allowed Status');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { Field: 'name', Requirement: 'Required', Notes: 'Resource display name.' },
      { Field: 'resourceCategory', Requirement: 'Required', Notes: 'Use one of the allowed categories.' },
      { Field: 'location', Requirement: 'Required', Notes: 'Location label shown in dropdowns.' },
      { Field: 'capacity', Requirement: 'Required', Notes: 'Seats or capacity based on category.' },
      { Field: 'inventoryMode', Requirement: 'Optional', Notes: 'area or single (open desk only).' },
      { Field: 'floor', Requirement: 'Optional', Notes: 'Floor label, e.g. 501.' },
      { Field: 'wing', Requirement: 'Optional', Notes: 'Short wing label, or blank.' },
      { Field: 'pricePerHour', Requirement: 'Optional', Notes: 'Hourly price set by Sales.' },
      { Field: 'pricePerDay', Requirement: 'Optional', Notes: 'Daily price set by Sales.' },
      { Field: 'credits', Requirement: 'Optional', Notes: 'Credit points per seat/hr (default 1).' },
      { Field: 'description', Requirement: 'Optional', Notes: 'Amenities or notes.' },
      { Field: 'status', Requirement: 'Optional', Notes: 'Use one of the allowed statuses.' },
    ]), 'Required Fields');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { Category: 'open_desk', InventoryMode: 'area', Capacity: '1-10', Pricing: 'Set hourly/daily/credits' },
      { Category: 'open_desk', InventoryMode: 'single', Capacity: '1', Pricing: 'Set hourly/daily/credits' },
      { Category: 'cabin_desk', InventoryMode: 'area', Capacity: '4, 6, 8, 10', Pricing: 'Set hourly/daily/credits' },
      { Category: 'meeting_room', InventoryMode: 'area', Capacity: 'Any', Pricing: 'Set hourly/daily/credits' },
      { Category: 'conference_room', InventoryMode: 'area', Capacity: 'Any', Pricing: 'Set hourly/daily/credits' },
      { Category: 'virtual_office', InventoryMode: 'single', Capacity: '1', Pricing: 'Set hourly/daily/credits' },
    ]), 'Capacity & Pricing Guide');
    XLSX.writeFile(workbook, 'resource-pricing-template.xlsx');
    toast.success('Template downloaded as resource-pricing-template.xlsx');
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setModalKind('package');
    setModalMode('add');
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
    setAddResourceForm({
      name: '', type: '', resourceCategory: '', inventoryMode: '', location: '', floor: '', wing: '', capacity: '1',
      pricePerHour: '', pricePerDay: '', credits: '1', status: 'Active', description: '',
    });
  };

  const openResourceModal = (resource) => {
    setModalKind('resource');
    setModalMode('edit');
    setSelectedItem(resource);
    setResourceForm({
      name: resource.name || '',
      type: resource.type || '',
      resourceCategory: resource.resourceCategory || 'open_desk',
      inventoryMode: resource.inventoryMode || 'area',
      location: resource.location || '',
      floor: resource.floor || '',
      wing: resource.wing || '',
      capacity: String(resource.capacity || '1'),
      description: resource.description || '',
      pricePerHour: String(resource.pricePerHour || ''),
      pricePerDay: String(resource.pricePerDay || ''),
      credits: String(resource.credits || 1),
      status: resource.status || 'Active',
    });
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
    setIsModalOpen(true);
  };

  const openResourceViewModal = (resource) => {
    setModalKind('resource');
    setModalMode('view');
    setSelectedItem(resource);
    setResourceForm({
      name: resource.name || '',
      type: resource.type || '',
      resourceCategory: resource.resourceCategory || 'open_desk',
      inventoryMode: resource.inventoryMode || 'area',
      location: resource.location || '',
      floor: resource.floor || '',
      wing: resource.wing || '',
      capacity: String(resource.capacity || '1'),
      description: resource.description || '',
      pricePerHour: String(resource.pricePerHour || ''),
      pricePerDay: String(resource.pricePerDay || ''),
      credits: String(resource.credits || 1),
      status: resource.status || 'Active',
    });
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
    setIsModalOpen(true);
  };

  const handleToggleResourceStatus = async (resource) => {
    const newStatus = resource.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const response = await updateResource(resource.recordId, { status: newStatus });
      const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
      setResources((current) => current.map((r) => (r.recordId === saved.recordId ? saved : r)));
      toast.success(`Resource ${newStatus.toLowerCase()} successfully.`);
    } catch (error) {
      toast.error(error.message || 'Unable to update resource status.');
    }
  };

  const openPackageModal = (category, item = null, mode = 'edit') => {
    if (mode !== 'view' && item?.category === 'Tenant' && item?.assignedTenantCompanyId && category !== 'Tenant') {
      toast.error('This tenant package is locked to a company and cannot be edited.');
      return;
    }

    setModalKind('package');
    setModalMode(item ? mode : 'add');
    setSelectedItem(item);
    const nextOpenDesks = String(item?.openDesks ?? item?.packageDetails?.openDesks ?? '');
    const nextCabinDesks = String(item?.cabinDesks ?? item?.packageDetails?.cabinDesks ?? '');
    const existingOpenDesks = Number(item?.openDesks ?? item?.packageDetails?.openDesks ?? 0);
    const existingCabinDesks = Number(item?.cabinDesks ?? item?.packageDetails?.cabinDesks ?? 0);
    const nextTotalSeats = String((category === 'Tenant' && (existingOpenDesks + existingCabinDesks) > 0)
      ? existingOpenDesks + existingCabinDesks
      : (item?.totalSeats ?? item?.packageDetails?.totalSeats ?? item?.seatsIncluded ?? ''));
    const nextCreditsPerSeat = String(item?.creditsPerSeat ?? item?.packageDetails?.creditsPerSeat ?? '');
    const nextMonthlyCredits = String(item?.monthlyCredits ?? item?.packageDetails?.monthlyTotalCredits ?? item?.creditsIncluded ?? '');
    const fallbackDeskRate = category === 'Tenant' && item
      ? Math.round(Number(item?.price || 0) / Math.max(1, Number(item?.durationMonths || TENANT_PACKAGE_MIN_DURATION_MONTHS) * TENANT_PACKAGE_MONTH_DAYS * Math.max(1, Number(item?.totalSeats || item?.seatsIncluded || 1))))
      : 0;
    const nextTenantScope = category === 'Tenant'
      ? getTenantPackageScope(item?.locationMappings || item?.packageDetails?.locationMappings) || (() => {
        const firstScopeResource = tenantAreaResources[0] || null;
        return firstScopeResource ? { floor: firstScopeResource.floor, wing: firstScopeResource.wing } : { floor: tenantFloorOptions[0] || '', wing: tenantWingOptions[0] || 'A' };
      })()
      : { floor: '', wing: '' };
    const nextTenantScopeResources = category === 'Tenant'
      ? getTenantScopeResources(resources, nextTenantScope.floor, nextTenantScope.wing)
      : [];
    const nextSelectedResourceIds = category === 'Tenant'
      ? ((item?.locationMappings?.length > 0 || item?.packageDetails?.locationMappings?.length > 0)
        ? getTenantSelectedResourceIds(nextTenantScopeResources, item.locationMappings?.length > 0 ? item.locationMappings : item.packageDetails.locationMappings)
        : getTenantPresetResourceIds(nextTenantScopeResources, 'all'))
      : [];

    setPackageForm({
      category,
      name: item?.name || '',
      creditsIncluded: String(category === 'Tenant' ? (item?.monthlyCredits ?? item?.packageDetails?.monthlyTotalCredits ?? item?.creditsIncluded ?? '') : (item?.creditsIncluded || '')),
      price: String(item?.price || item?.packageDetails?.totalContractValue || item?.packageDetails?.price || ''),
      durationMonths: String(item?.durationMonths || item?.packageDetails?.durationMonths || (category === 'Tenant' ? TENANT_PACKAGE_MIN_DURATION_MONTHS : 1)),
      floor: nextTenantScope.floor || '',
      wing: nextTenantScope.wing || '',
      selectedResourceIds: nextSelectedResourceIds,
      seatsIncluded: String(category === 'Tenant' ? (item?.totalSeats ?? item?.packageDetails?.totalSeats ?? item?.seatsIncluded ?? 0) : (item?.seatsIncluded || 0)),
      totalSeats: nextTotalSeats,
      openDesks: String(item?.openDesks ?? item?.packageDetails?.openDesks ?? ''),
      cabinDesks: nextCabinDesks,
      ratePerOpenDesk: String(item?.ratePerOpenDesk ?? item?.packageDetails?.ratePerOpenDesk ?? (category === 'Tenant' ? fallbackDeskRate : '')),
      ratePerCabinDesk: String(item?.ratePerCabinDesk ?? item?.packageDetails?.ratePerCabinDesk ?? (category === 'Tenant' ? fallbackDeskRate : '')),
      creditsPerSeat: nextCreditsPerSeat,
      monthlyCredits: nextMonthlyCredits,
      description: item?.description || '',
      featuresText: item ? featuresToText(item.features) : '',
      isRecommended: Boolean(item?.isRecommended),
      status: item?.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      if ((modalKind === 'package' && modalMode === 'view') || (modalKind === 'resource' && modalMode === 'view')) {
        closeModal();
        return;
      }

      if (modalKind === 'resource') {
        if (modalMode === 'add') {
          const category = addResourceForm.resourceCategory;
          const inventoryMode = category === 'virtual_office' ? 'single' : category === 'cabin_desk' ? 'area' : addResourceForm.inventoryMode;
          const payload = {
            name: addResourceForm.name.trim(),
            type: addResourceForm.type || deriveResourceTypeFromCategory(category),
            resourceCategory: category,
            inventoryMode,
            location: addResourceForm.location.trim() || addResourceForm.name.trim(),
            floor: addResourceForm.floor.trim() || '',
            wing: addResourceForm.wing.trim(),
            capacity: Number(addResourceForm.capacity || 1),
            pricePerHour: Number(addResourceForm.pricePerHour || 0),
            pricePerDay: Number(addResourceForm.pricePerDay || 0),
            credits: Number(addResourceForm.credits || 1),
            description: addResourceForm.description.trim(),
            status: addResourceForm.status,
          };
          const response = await createResource(payload);
          const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
          setResources((current) => [saved, ...current]);
          toast.success('Resource created successfully.');
          closeModal();
          return;
        }
        if (selectedItem) {
          const editCategory = resourceForm.resourceCategory;
          const editInventoryMode = editCategory === 'virtual_office' ? 'single' : editCategory === 'cabin_desk' ? 'area' : resourceForm.inventoryMode;
          const response = await updateResource(selectedItem.recordId, {
            name: resourceForm.name.trim(),
            type: resourceForm.type || deriveResourceTypeFromCategory(editCategory),
            resourceCategory: editCategory,
            inventoryMode: editInventoryMode,
            location: resourceForm.location.trim() || resourceForm.name.trim(),
            floor: resourceForm.floor.trim() || '',
            wing: resourceForm.wing.trim(),
            capacity: Number(resourceForm.capacity || 1),
            description: resourceForm.description.trim(),
            pricePerHour: Number(resourceForm.pricePerHour || 0),
            pricePerDay: Number(resourceForm.pricePerDay || 0),
            credits: Number(resourceForm.credits || 1),
            status: resourceForm.status,
          });
          const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
          setResources((current) => current.map((item) => (item.recordId === saved.recordId ? saved : item)));
          toast.success('Resource pricing and credits updated successfully.');
          closeModal();
          return;
        }
      }

      if (modalKind === 'package') {
        const isTenantPackage = packageForm.category === 'Tenant';
        const isTenantPackageRateOnlyEdit = isTenantPackageRateEdit && selectedItem?.assignedTenantCompanyId;
        if (isTenantPackageRateOnlyEdit) {
          const ratePerOpenDesk = Number(packageForm.ratePerOpenDesk || 0);
          const ratePerCabinDesk = Number(packageForm.ratePerCabinDesk || 0);
          if (ratePerOpenDesk <= 0 || ratePerCabinDesk <= 0) {
            throw new Error('Set both open desk and cabin desk rates before saving.');
          }

          const response = await updatePricingPackage(selectedItem.recordId, {
            ratePerOpenDesk,
            ratePerCabinDesk,
          });
          const saved = normalizePackage(response?.data?.data?.package || response?.data?.package);
          setPackages((current) => current.map((item) => (item.recordId === saved.recordId ? saved : item)));
          toast.success('Desk prices updated successfully.');
          closeModal();
          return;
        }

        const monthlyCredits = isTenantPackage ? tenantPackageSummary.monthlyCredits : Number(packageForm.creditsIncluded || 0);
        const totalSeats = isTenantPackage ? tenantPackageSummary.totalSeats : Number(packageForm.seatsIncluded || 0);
        const durationMonths = isTenantPackage
          ? Math.max(TENANT_PACKAGE_MIN_DURATION_MONTHS, Number(packageForm.durationMonths || TENANT_PACKAGE_MIN_DURATION_MONTHS))
          : Number(packageForm.durationMonths || 1);
        if (isTenantPackage && tenantPackageScopeResources.length === 0) {
          throw new Error('Select a floor that contains open desk or cabin desk area blocks.');
        }
        if (isTenantPackage && !packageForm.floor) {
          throw new Error('Choose a floor for the tenant package.');
        }
        if (isTenantPackage && tenantPackageSelectedResources.length === 0) {
          throw new Error('Select at least one open desk or cabin desk block for the package.');
        }
        if (isTenantPackage && tenantPackageSummary.totalSeats <= 0) {
          throw new Error('The selected tenant package scope must include seats.');
        }
        if (isTenantPackage && tenantPackageSummary.dailyRateTotal <= 0) {
          throw new Error('Set tenant package rates for open and cabin desks before creating the package.');
        }
        const payload = isTenantPackageRateEdit && selectedItem?.assignedTenantCompanyId
          ? {
            ratePerOpenDesk: Number(packageForm.ratePerOpenDesk || 0),
            ratePerCabinDesk: Number(packageForm.ratePerCabinDesk || 0),
          }
          : {
            category: packageForm.category,
            name: packageForm.name.trim(),
            creditsIncluded: monthlyCredits,
            price: isTenantPackage ? tenantPackageSummary.totalContractValue : Number(packageForm.price || 0),
            durationMonths,
            seatsIncluded: totalSeats,
            totalSeats,
            openDesks: isTenantPackage ? tenantPackageSummary.openDesks : 0,
            cabinDesks: isTenantPackage ? tenantPackageSummary.cabinDesks : 0,
            ratePerOpenDesk: isTenantPackage ? Number(tenantPackageSummary.ratePerOpenDesk || 0) : 0,
            ratePerCabinDesk: isTenantPackage ? Number(tenantPackageSummary.ratePerCabinDesk || 0) : 0,
            creditsPerSeat: isTenantPackage ? tenantPackageSummary.creditsPerSeat : 0,
            monthlyCredits: isTenantPackage ? monthlyCredits : Number(packageForm.creditsIncluded || 0),
            locationMappings: isTenantPackage ? tenantPackageSummary.locationMappings : [],
            description: packageForm.description.trim(),
            features: parseFeatures(packageForm.featuresText),
            isRecommended: Boolean(packageForm.isRecommended),
            status: packageForm.status,
          };
        const response = modalMode === 'add'
          ? await createPricingPackage(payload)
          : await updatePricingPackage(selectedItem.recordId, payload);
        const saved = normalizePackage(response?.data?.data?.package || response?.data?.package);
        setPackages((current) => (modalMode === 'add' ? [saved, ...current] : current.map((item) => (item.recordId === saved.recordId ? saved : item))));
        toast.success(modalMode === 'add' ? 'Package created successfully.' : 'Package updated successfully.');
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save pricing configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackage = async (item) => {
    const confirmed = window.confirm(`Delete ${item.name}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deletePricingPackage(item.recordId);
      setPackages((current) => current.filter((entry) => entry.recordId !== item.recordId));
      toast.success('Package deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to delete package.');
    }
  };

  const updateTenantScopeSelection = (nextFloor, nextWing) => {
    const scopedResources = getTenantScopeResources(resources, nextFloor, nextWing);
    const nextSelectedResourceIds = getTenantPresetResourceIds(scopedResources, 'all');

    setPackageForm((current) => ({
      ...current,
      floor: nextFloor,
      wing: nextWing,
      selectedResourceIds: nextSelectedResourceIds,
    }));
  };

  const handleTenantSelectionPresetChange = (preset) => {
    const nextSelectedResourceIds = getTenantPresetResourceIds(tenantPackageScopeResources, preset);
    setPackageForm((current) => ({
      ...current,
      selectedResourceIds: nextSelectedResourceIds,
    }));
  };

  const clearResourceFilters = () => {
    setResourceCategoryFilter('All Categories');
    setResourceFloorFilter('All Floors');
    setResourceWingFilter('All Wings');
    setResourceStatusFilter('All Status');
  };

  const handleExportPackagesReport = async (format = 'PDF') => {
    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    const sourceItems = activeTab === 'resource' ? filteredResources : filteredPackages;

    if (sourceItems.length === 0) {
      toast.error(activeTab === 'resource' ? 'There are no resources to export.' : 'There are no packages to export.');
      return;
    }

    setIsExportingReport(reportFormat);

    try {
      const scopeLabel = activeTab === 'resource'
        ? 'Resource Pricing'
        : activeTab === 'membership'
          ? 'Membership Packages'
          : 'Tenant Packages';
      const reportRows = activeTab === 'resource'
        ? buildResourcesExportRows(sourceItems, scopeLabel, {
          searchQuery,
          categoryFilter: resourceCategoryFilter,
          floorFilter: resourceFloorFilter,
          wingFilter: resourceWingFilter,
          statusFilter: resourceStatusFilter,
        })
        : buildPackagesExportRows(sourceItems, scopeLabel, { searchQuery });

      const response = await createReport({
        title: `Sales ${scopeLabel}`,
        department: 'Sales',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: scopeLabel,
        generatedBy: currentUserName,
        format: reportFormat,
        description: `Sales ${scopeLabel.toLowerCase()} export for the current filtered view.`,
        sourceType: 'department-roster',
        sourceRef: `sales-pricing-${activeTab}`,
        reportRows,
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }

      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Pricing report saved to Reports.' : 'Pricing report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : '/dashboard/sales-crm/report');
    } catch (error) {
      toast.error(error?.message || 'Unable to export pricing report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const handleExportPackageReport = async (item, format = 'PDF') => {
    if (!item) return;

    const reportFormat = String(format).toLowerCase() === 'excel' ? 'Excel' : 'PDF';
    setIsExportingReport(reportFormat);

    try {
      const response = await createReport({
        title: `${item.name || 'Package'} Report`,
        department: 'Sales',
        category: 'Other',
        dataWindow: 'Custom',
        reportMonth: new Date().toISOString().slice(0, 7),
        period: item.category === 'Tenant' ? 'Tenant Package Profile' : 'Membership Package Profile',
        generatedBy: currentUserName,
        format: reportFormat,
        description: `${item.name || 'Package'} pricing and configuration summary.`,
        sourceType: 'custom',
        sourceRef: String(item.recordId || item.id || item.packageCode || item.name || '').trim(),
        reportRows: buildPackageExportRows(item),
        monthlyData: [],
      });

      if (reportFormat === 'PDF') {
        await downloadReportFile(response?.data?.download, { openInNewTab: false });
      }

      const createdReportId = response?.data?.report?.recordId;
      window.dispatchEvent(new Event('reports:refresh'));
      toast.success(reportFormat === 'PDF' ? 'Package report saved to Reports.' : 'Package report saved to Reports. Preview it before downloading.');
      navigate(createdReportId ? `/dashboard/sales-crm/report?reportId=${createdReportId}` : '/dashboard/sales-crm/report');
    } catch (error) {
      toast.error(error?.message || 'Unable to export package report.');
    } finally {
      setIsExportingReport('');
    }
  };

  const toggleTenantResourceSelection = (resourceId) => {
    const normalizedId = String(resourceId || '').trim();
    if (!normalizedId) return;

    setPackageForm((current) => {
      const currentIds = Array.isArray(current.selectedResourceIds) ? current.selectedResourceIds.map((value) => String(value || '').trim()).filter(Boolean) : [];
      const selected = currentIds.includes(normalizedId)
        ? currentIds.filter((value) => value !== normalizedId)
        : [...currentIds, normalizedId];

      return {
        ...current,
        selectedResourceIds: selected,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame><ResourcePricingSkeleton /></PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        {errorMessage ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-[12px] font-pmedium text-red-700 flex-1">{errorMessage}</p>
            <button type="button" onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
        ) : null}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              Resource &amp; Pricing
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Manage resources, pricing, credits, and membership packages.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            
            {activeTab === 'resource' ? (
              <>
                <input ref={bulkUploadInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkFileSelected} />

                <button
                                              type="button"
                                              // onClick={handleBulkUploadClick}
                                              className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-100 hover:border-slate-500 text-slate-500 transition-all active:scale-95 shadow-sm"
                                            >
                                              <UploadCloud size={13} /> 
                                              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-500 text-white px-1.5 py-0.5 rounded">BULK UPLOAD</span>
                                            </button>

              </>
            ) : null}
            <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>
            
          </div>
        </div>

        {/* 2. MAIN TABS (pill-style matching DESIGN.md) */}
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {[
            { key: 'resource', label: 'Resources' },
            { key: 'membership', label: 'Memberships' },
            { key: 'tenant', label: 'Tenant Packages' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >{tab.label}</button>
          ))}
        </div>

        {/* 3. STAT CARDS (DESIGN.md 4-col grid with border-left accents) */}
        <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Resources Priced</p>
              <p className="text-[15px] font-pmedium text-slate-900">{resources.length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Monitor size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-indigo-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-indigo-600 uppercase tracking-widest mb-1">Membership Packages</p>
              <p className="text-[15px] font-pmedium text-slate-900">{membershipPackages.length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0"><CreditCard size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-emerald-600 uppercase tracking-widest mb-1">Tenant Packages</p>
              <p className="text-[15px] font-pmedium text-slate-900">{tenantPackages.length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><Building2 size={16} /></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Recommended</p>
              <p className="text-[15px] font-pmedium text-slate-900">{packages.filter((item) => item.isRecommended).length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Tag size={16} /></div>
          </div>
        </div>

        <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
            {/* LEFT: status sub-tab pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {(activeTab === 'resource'
                ? ['All Status', ...resourceStatusOptions]
                : ['All Status', ...packageStatusOptions]
              ).map((status) => {
                const isSelected = activeTab === 'resource' ? resourceStatusFilter === status : packageStatusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => (activeTab === 'resource' ? setResourceStatusFilter(status) : setPackageStatusFilter(status))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {status === 'All Status' ? 'All' : status}
                  </button>
                );
              })}
            </div>

            {/* RIGHT: search + primary action */}
            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" placeholder={`Search ${activeTab === 'resource' ? 'resources' : 'packages'}...`} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {activeTab === 'resource' ? (
                <button onClick={openAddResourceModal} className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap">
                  <Plus size={13} strokeWidth={3} /> ADD RESOURCE
                </button>
              ) : (
                <button onClick={() => openPackageModal(activeTab === 'membership' ? 'Membership' : 'Tenant')} className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap">
                  <Plus size={13} strokeWidth={3} /> ADD {activeTab === 'membership' ? 'MEMBERSHIP' : 'PACKAGE'}
                </button>
              )}
            </div>
          </div>

          {activeTab === 'resource' ? (
            <div className="border-b border-slate-100 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-end">
                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Category</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={resourceCategoryFilter}
                    onChange={(event) => setResourceCategoryFilter(event.target.value)}
                  >
                    <option>All Categories</option>
                    {resourceCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Floor</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={resourceFloorFilter}
                    onChange={(event) => setResourceFloorFilter(event.target.value)}
                  >
                    <option>All Floors</option>
                    {availableResourceFloors.map((floor) => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Wing</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={resourceWingFilter}
                    onChange={(event) => setResourceWingFilter(event.target.value)}
                  >
                    <option>All Wings</option>
                    {availableResourceWings.map((wing) => (
                      <option key={wing} value={wing}>{wing}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={clearResourceFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <X size={14} /> Reset Filters
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                {activeTab === 'resource' ? (
                  <tr><th className="px-3.5 py-2 w-8 text-center">#</th><th className="px-3.5 py-2">Resource</th><th className="px-3.5 py-2">Category</th><th className="px-3.5 py-2">Inventory</th><th className="px-3.5 py-2">Floor</th><th className="px-3.5 py-2">Wing</th><th className="px-3.5 py-2">Capacity</th><th className="px-3.5 py-2">Hourly</th><th className="px-3.5 py-2">Daily</th><th className="px-3.5 py-2">Credits</th><th className="px-3.5 py-2 text-center">Status</th><th className="px-3.5 py-2 text-center">Actions</th></tr>
                ) : activeTab === 'membership' ? (
                  <tr><th className="px-3.5 py-2">Plan Name</th><th className="px-3.5 py-2">Credits</th><th className="px-3.5 py-2">Duration</th><th className="px-3.5 py-2">Price</th><th className="px-3.5 py-2 text-center">Status</th><th className="px-3.5 py-2 text-center">Actions</th></tr>
                ) : (
                  <tr><th className="px-3.5 py-2">Package Name</th><th className="px-3.5 py-2">Coverage</th><th className="px-3.5 py-2">Monthly Credits</th><th className="px-3.5 py-2">Duration</th><th className="px-3.5 py-2">Contract Value</th><th className="px-3.5 py-2 text-center">Status</th><th className="px-3.5 py-2 text-center">Actions</th></tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-50">
                {activeTab === 'resource' ? filteredResources.map((item, index) => (
                  <tr key={item.recordId} className="transition-all hover:bg-blue-50/30">
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500 text-center">{index + 1}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900">{item.name}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{getResourceCategoryLabel(item.resourceCategory)}</td>
                    <td className="px-3.5 py-2">
                      {isDeskCategory(item.resourceCategory) ? (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${item.inventoryMode === 'area'
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}>
                          {getInventoryModeLabel(item.inventoryMode)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                          Not applicable
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{item.floor || '--'}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{item.wing || '--'}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{item.capacity} Pax</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{item.pricePerHour > 0 ? `${formatCurrency(item.pricePerHour)} ` : item.pricing || '--'}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{item.pricePerDay > 0 ? `${formatCurrency(item.pricePerDay)} ` : item.pricing || '--'}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900 text-center">{getResourceCreditValue(item)}</td>
                    <td className="px-3.5 py-2 text-center">{statusBadge(item.status)}</td>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => openResourceViewModal(item)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" title="View Details"><Eye size={14} /></button>
                        <button type="button" onClick={() => openResourceModal(item)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600" title="Edit Pricing & Credits"><Edit2 size={14} /></button>
                        <button type="button" onClick={() => handleToggleResourceStatus(item)} className={`rounded-lg border p-2 shadow-sm transition-all ${item.status === 'Active' ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300' : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`} title={item.status === 'Active' ? 'Disable Resource' : 'Enable Resource'}>
                          {item.status === 'Active' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : filteredPackages.map((item) => (
                  <tr key={item.recordId} className={`transition-all hover:bg-indigo-50/30 ${item.status === 'Disabled' ? 'opacity-60' : ''}`}>
                    <td className="px-3.5 py-2">
                      <p className="text-[12px] font-pmedium text-slate-900">{item.name}</p>
                      <p className="mt-0.5 max-w-65 truncate text-[10px] font-pmedium text-slate-500" title={item.description}>{item.description || 'No description added.'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.isRecommended ? <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-amber-700">Recommended</span> : null}
                        {item.isCustom ? <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-emerald-700">Custom</span> : null}
                        {item.assignedTenantCompanyId ? (
                          <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-rose-700">
                            Locked to {item.assignedTenantCompanyName || 'tenant'}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">
                      {item.category === 'Tenant' ? (
                        <div className="space-y-1">
                          <p>{Array.from(new Set((item.locationMappings || []).map((mapping) => getTenantResourceLocation(mapping)).filter(Boolean))).join(', ') || 'Unassigned'}</p>
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                            {Number(item.openDesks || 0)} open / {Number(item.cabinDesks || 0)} cabin / {Number(item.totalSeats || item.seatsIncluded || 0)} seats
                          </p>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-3.5 py-2">
                      {item.category === 'Tenant' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-pmedium uppercase text-indigo-700">
                            <Tag size={10} /> {Number(item.monthlyCredits || item.creditsIncluded || 0)} Monthly Credits
                          </span>
                          <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                            {Math.round(Number(item.creditsPerSeat || 0))} / seat, expires monthly
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-pmedium uppercase text-indigo-700"><Tag size={10} /> {item.creditsIncluded} Credits</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{durationLabel(item.durationMonths)}</td>
                    <td className="px-3.5 py-2 text-[12px] font-pmedium text-emerald-600">
                      <div>{formatCurrency(item.price)}</div>
                      <div className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                        {item.category === 'Tenant' && item.durationMonths > 0
                          ? `${formatCurrency(item.price / item.durationMonths)} / month`
                          : 'Total price'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2 text-center">{statusBadge(item.status)}</td>
                    <td className="px-3.5 py-2">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPackageModal(item.category, item, 'view')}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {!item.assignedTenantCompanyId ? (
                          <button
                            type="button"
                            onClick={() => openPackageModal(item.category, item)}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit Package"
                          >
                            <Edit2 size={14} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(item)}
                          disabled={Boolean(item.assignedTenantCompanyId)}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {((activeTab === 'resource' && filteredResources.length === 0) || (activeTab !== 'resource' && filteredPackages.length === 0)) ? (
                  <tr>
                    <td colSpan={activeTab === 'resource' ? 12 : activeTab === 'membership' ? 6 : 7} className="bg-slate-50/50 py-20 text-center text-slate-400">
                      <div className="mx-auto max-w-md">
                        <p className="text-sm font-pmedium">{activeTab === 'resource' ? 'No resources found.' : 'No packages found yet.'}</p>
                        <p className="mt-2 text-xs font-pmedium leading-relaxed">
                          {activeTab === 'resource' ? 'Add resources from Resource Management first, then price them here.' : 'Create a package to make it available for tenant companies.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bulk Upload Modal ─────────────────────────────────────────── */}
        {isBulkUploadOpen ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-blue-50/70 p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-pmedium text-primary tracking-tight">
                    <UploadCloud size={20} /> Bulk Upload Resources
                  </h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Import resources from Excel or CSV</p>
                </div>
                <button onClick={() => setIsBulkUploadOpen(false)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto bg-slate-50/60 p-5">
                <button
                  type="button"
                  onClick={() => setIsTemplateInfoOpen(!isTemplateInfoOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition-all hover:bg-blue-100"
                >
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Template required</p>
                  <ChevronDown
                    size={16}
                    className={`text-blue-500 transition-transform duration-200 ${isTemplateInfoOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isTemplateInfoOpen ? (
                  <div className="space-y-4 pl-2">
                    <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm font-pmedium text-blue-800">
                        Download the template first to avoid validation errors. Cabin desks are area blocks only, so single cabin rows will be rejected.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">Fields (from Add Resource form)</p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-pmedium text-red-600">Required</span>
                          <span className="font-pmedium text-slate-700">name, location, resourceCategory, floor, capacity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-pmedium text-amber-600">Conditional</span>
                          <span className="font-pmedium text-slate-700">inventoryMode (for open desks)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-pmedium text-slate-500">Optional</span>
                          <span className="font-pmedium text-slate-700">wing, description, pricePerHour, pricePerDay, credits, status</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsAllowedValuesOpen(!isAllowedValuesOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition-all hover:bg-blue-100"
                >
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Allowed values</p>
                  <ChevronDown
                    size={16}
                    className={`text-blue-500 transition-transform duration-200 ${isAllowedValuesOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isAllowedValuesOpen ? (
                  <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-pmedium text-blue-800 leading-6">
                      Categories: {resourceCategoryOptions.map((option) => `${option.label} (${option.value})`).join(', ')}
                      <br />
                      Inventory: {inventoryModeOptions.map((option) => option.value).join(', ')}
                      <br />
                      Status: {resourceStatusOptions.join(', ')}
                      <br />
                      Capacity rules: open desk area = 1-10, cabin desk area = 4/6/8/10, single desk = 1, virtual office = 1.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={downloadBulkTemplate} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm flex-1 py-3 text-sm font-pmedium inline-flex items-center justify-center gap-2 transition-all hover:border-blue-200 hover:text-blue-600">
                    <Download size={16} /> Download Template
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkUploadInputRef.current?.click()}
                    disabled={isBulkImporting}
                    className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-pmedium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none inline-flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={16} /> {isBulkImporting ? 'Importing...' : 'Choose File'}
                  </button>
                </div>

                {bulkUploadFileName ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Selected file</p>
                    <p className="mt-2 text-sm font-pmedium text-slate-800">{bulkUploadFileName}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-5 sm:flex-row">
                <button type="button" onClick={() => setIsBulkUploadOpen(false)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm flex-1 py-3 text-sm font-pmedium transition-all hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {bulkUploadSummary ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl border border-white/70 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white"><UploadCloud size={18} /></div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Bulk Upload Results</h2>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-1">Import completed for {bulkUploadSummary.fileName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setBulkUploadSummary(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Created</p>
                    <p className="mt-1 text-2xl font-pmedium text-emerald-700">{bulkUploadSummary.createdCount}</p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-red-600">Failed</p>
                    <p className="mt-1 text-2xl font-pmedium text-red-700">{bulkUploadSummary.failedCount}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Processed {bulkUploadSummary.processedRows} of {bulkUploadSummary.totalRows} rows</p>
                </div>
                {bulkUploadSummary.failedRows.length > 0 ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-red-600 mb-2">Errors (first 5)</p>
                    <ul className="space-y-1">
                      {bulkUploadSummary.failedRows.map((msg, i) => <li key={i} className="text-[11px] font-pmedium text-red-700">{msg}</li>)}
                    </ul>
                  </div>
                ) : null}
                <button type="button" onClick={() => setBulkUploadSummary(null)} className="w-full rounded-xl bg-blue-600 py-2.5 text-[11px] font-pmedium text-white transition-all hover:bg-blue-700">CLOSE</button>
              </div>
            </div>
          </div>
        ) : null}

        {isModalOpen ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className={`flex max-h-[95vh] w-full flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70 ${modalKind === 'package' && (isViewingPackage ? viewPackageCategory === 'Tenant' : packageForm.category === 'Tenant') ? 'max-w-5xl' : 'max-w-2xl'}`}>
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    {modalKind === 'resource' ? (modalMode === 'add' ? <Plus size={18} /> : isViewingResource ? <Eye size={18} /> : <Monitor size={18} />) : isViewingPackage ? <Eye size={18} /> : <Plus size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">
                      {modalKind === 'resource' ? (modalMode === 'add' ? 'Add New Resource' : isViewingResource ? 'View Resource Details' : 'Edit Resource Pricing & Credits') : isViewingPackage ? 'View Package Details' : `${modalMode === 'add' ? 'Add New' : 'Edit'} Package`}
                    </h2>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-1 truncate">
                      {modalKind === 'resource' ? (modalMode === 'add' ? 'Create a new resource with pricing and credits. This will sync to Resource Management.' : isViewingResource ? 'Viewing resource details in read-only mode.' : 'Edit resource details, pricing, and credits. Changes sync back to Resource Management.') : isViewingPackage ? 'Viewing tenant package details in read-only mode.' : 'Package changes drive tenant company onboarding.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isViewingPackage ? (
                    <>
                      <button type="button" onClick={() => handleExportPackageReport(selectedPackage, 'PDF')} disabled={isExportingReport === 'PDF' || isExportingReport === 'Excel'} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 hover:bg-red-50 transition-colors" title="Download PDF"><FileDown size={14} /></button>
                      <button type="button" onClick={() => handleExportPackageReport(selectedPackage, 'Excel')} disabled={isExportingReport === 'PDF' || isExportingReport === 'Excel'} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Download Excel"><FileSpreadsheet size={14} /></button>
                    </>
                  ) : null}
                  <button type="button" onClick={closeModal} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors"><X size={16} /></button>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto bg-white p-3 sm:p-4">
                {modalKind === 'resource' && modalMode === 'add' ? (
                  <div className="space-y-3">

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Resource snapshot</p>
                          <p className="mt-0.5 text-[11px] font-pmedium text-slate-500">Summary before saving.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">
                            {getResourceCategoryLabel(addResourceForm.resourceCategory)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-600">
                            {addResourceForm.location || 'Location pending'}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-600">
                            Floor {addResourceForm.floor || '--'}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-600">
                            Wing {addResourceForm.wing || 'N/A'}
                          </span>
                          {isDeskCategory(addResourceForm.resourceCategory) ? (
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-emerald-700">
                              {getInventoryModeLabel(addResourceForm.inventoryMode)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Resource Name *</label>
                      <input required type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.name} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>

                    <div className={`grid grid-cols-1 gap-3 ${addResourceForm.resourceCategory === 'open_desk' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Location *</label>
                        {locationMode === 'custom' ? (
                          <div className="space-y-1.5">
                            <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.location} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Enter new location" />
                            <button type="button" onClick={() => { setLocationMode('select'); setAddResourceForm((prev) => ({ ...prev, location: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select required className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.location || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setLocationMode('custom'); setAddResourceForm((prev) => ({ ...prev, location: '' })); return; }
                              setAddResourceForm((prev) => ({ ...prev, location: nextValue }));
                            }}>
                              <option value="">Select location</option>
                              {availableResourceLocations.map((location) => (<option key={location} value={location}>{location}</option>))}
                              <option value={ADD_NEW_OPTION}>Add new location</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Category *</label>
                        <select required className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.resourceCategory} onChange={(e) => {
                          const nextCategory = e.target.value;
                          const nextInventoryMode = nextCategory === 'virtual_office' ? 'single' : nextCategory === 'cabin_desk' ? 'area' : isDeskCategory(nextCategory) ? '' : 'area';
                          setAddResourceForm((prev) => ({
                            ...prev,
                            resourceCategory: nextCategory,
                            type: deriveResourceTypeFromCategory(nextCategory),
                            inventoryMode: nextInventoryMode,
                            capacity: normalizeCapacityForSelection(nextCategory, nextInventoryMode, nextCategory === 'virtual_office' ? '1' : prev.capacity),
                          }));
                        }}>
                          <option value="">Select category</option>
                          {resourceCategoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>

                      {addResourceForm.resourceCategory === 'open_desk' ? (
                        <div className="space-y-1">
                          <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Inventory *</label>
                          <div className="relative">
                            <select required className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.inventoryMode} onChange={(e) => {
                              const nextInventoryMode = e.target.value;
                              setAddResourceForm((prev) => ({
                                ...prev,
                                inventoryMode: nextInventoryMode,
                                capacity: normalizeCapacityForSelection(prev.resourceCategory, nextInventoryMode, nextInventoryMode === 'single' ? '1' : prev.capacity),
                              }));
                            }}>
                              <option value="">Select inventory</option>
                              {inventoryModeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Floor *</label>
                        {floorMode === 'custom' ? (
                          <div className="space-y-1.5">
                            <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.floor} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, floor: e.target.value }))} placeholder="Enter new floor" />
                            <button type="button" onClick={() => { setFloorMode('select'); setAddResourceForm((prev) => ({ ...prev, floor: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select required className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.floor || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setFloorMode('custom'); setAddResourceForm((prev) => ({ ...prev, floor: '' })); return; }
                              setAddResourceForm((prev) => ({ ...prev, floor: nextValue }));
                            }}>
                              <option value="">Select floor</option>
                              {availableResourceFloors.map((floor) => (<option key={floor} value={floor}>{floor}</option>))}
                              <option value={ADD_NEW_OPTION}>Add new floor</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Wing</label>
                        {wingMode === 'custom' ? (
                          <div className="space-y-1.5">
                            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.wing} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, wing: e.target.value }))} placeholder="Enter new wing" />
                            <button type="button" onClick={() => { setWingMode('select'); setAddResourceForm((prev) => ({ ...prev, wing: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.wing || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setWingMode('custom'); setAddResourceForm((prev) => ({ ...prev, wing: '' })); return; }
                              setAddResourceForm((prev) => ({ ...prev, wing: nextValue }));
                            }}>
                              <option value="">Select wing</option>
                              {availableResourceWings.map((wing) => (<option key={wing} value={wing}>{wing}</option>))}
                              <option value={ADD_NEW_OPTION}>Add new wing</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                        {isDeskCategory(addResourceForm.resourceCategory) ? 'Seats *' : 'Capacity *'}
                      </label>
                      {(() => {
                        const capacityOptions = getCapacityOptions(addResourceForm.resourceCategory, addResourceForm.inventoryMode);
                        const isSingleDeskInventory = addResourceForm.resourceCategory === 'open_desk' && addResourceForm.inventoryMode === 'single';
                        const selectedDeskCapacity = normalizeCapacityForSelection(addResourceForm.resourceCategory, addResourceForm.inventoryMode, addResourceForm.capacity);
                        return isDeskCategory(addResourceForm.resourceCategory) && capacityOptions.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <select required disabled={isSingleDeskInventory} className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" value={selectedDeskCapacity} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, capacity: e.target.value }))}>
                                {capacityOptions.map((option) => (
                                  <option key={option} value={String(option)}>{option} {isSingleDeskInventory && option === 1 ? 'desk fixed' : option === 1 ? 'desk' : 'seats'}</option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            </div>
                            {isSingleDeskInventory ? (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-pmedium text-emerald-800">Single desks are fixed to 1 desk.</div>
                            ) : null}
                          </div>
                        ) : (
                          <input required type="number" min="1" placeholder="Enter capacity" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500" value={addResourceForm.capacity} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, capacity: e.target.value }))} />
                        );
                      })()}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Description / Amenities</label>
                      <textarea rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-pmedium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={addResourceForm.description} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-amber-600 mb-2">Pricing & Credits (set by Sales)</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-slate-800">Price Per Hour (&#8377;)</label>
                          <input type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={addResourceForm.pricePerHour} onChange={(e) => setAddResourceForm((current) => {
                            const nextHour = e.target.value;
                            if (nextHour === '') return { ...current, pricePerHour: '', pricePerDay: '' };
                            const hourly = Number(nextHour);
                            if (!Number.isFinite(hourly) || hourly < 0) return { ...current, pricePerHour: nextHour };
                            return { ...current, pricePerHour: nextHour, pricePerDay: formatAutoPriceValue(hourly * RESOURCE_FULL_DAY_HOURS) };
                          })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-slate-800">Price Per Day (&#8377;)</label>
                          <input type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={addResourceForm.pricePerDay} onChange={(e) => setAddResourceForm((current) => {
                            const nextDay = e.target.value;
                            if (nextDay === '') return { ...current, pricePerDay: '', pricePerHour: '' };
                            const daily = Number(nextDay);
                            if (!Number.isFinite(daily) || daily < 0) return { ...current, pricePerDay: nextDay };
                            return { ...current, pricePerDay: nextDay, pricePerHour: formatAutoPriceValue(daily / RESOURCE_FULL_DAY_HOURS) };
                          })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-slate-800">Credits</label>
                          <input type="number" min="1" className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={addResourceForm.credits} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, credits: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Status</label>
                      <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={addResourceForm.status} onChange={(e) => setAddResourceForm((prev) => ({ ...prev, status: e.target.value }))}>
                        {resourceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </div>
                ) : modalKind === 'resource' ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-[11px] font-pmedium uppercase tracking-widest text-blue-500">Resource</p>
                      <p className="mt-1 text-base font-pmedium text-blue-900">{resourceForm.name || selectedItem?.name}</p>
                      <p className="text-[12px] font-pmedium text-blue-700">{resourceForm.type || selectedItem?.type}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
                          {getResourceCategoryLabel(resourceForm.resourceCategory)}
                        </span>
                        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
                          {isDeskCategory(resourceForm.resourceCategory) ? getInventoryModeLabel(resourceForm.inventoryMode) : 'Not applicable'}
                        </span>
                        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
                          Floor {resourceForm.floor || '--'}
                        </span>
                        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-pmedium uppercase tracking-widest text-blue-700">
                          Wing {resourceForm.wing || '--'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Resource Name *</label>
                      <input required disabled={isViewingResource} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.name} onChange={(e) => setResourceForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>

                    <div className={`grid grid-cols-1 gap-4 ${resourceForm.resourceCategory === 'open_desk' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Location *</label>
                        {locationMode === 'custom' ? (
                          <div className="space-y-2">
                            <input required disabled={isViewingResource} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.location} onChange={(e) => setResourceForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Enter new location" />
                            {!isViewingResource && <button type="button" onClick={() => { setLocationMode('select'); setResourceForm((prev) => ({ ...prev, location: '' })); }} className="text-xs font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>}
                          </div>
                        ) : (
                          <div className="relative">
                            <select required disabled={isViewingResource} className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.location || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setLocationMode('custom'); setResourceForm((prev) => ({ ...prev, location: '' })); return; }
                              setResourceForm((prev) => ({ ...prev, location: nextValue }));
                            }}>
                              <option value="">Select location</option>
                              {availableResourceLocations.map((location) => (<option key={location} value={location}>{location}</option>))}
                              {!isViewingResource && <option value={ADD_NEW_OPTION}>Add new location</option>}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Category *</label>
                        <select required disabled={isViewingResource} className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.resourceCategory} onChange={(e) => {
                          const nextCategory = e.target.value;
                          const nextInventoryMode = nextCategory === 'virtual_office' ? 'single' : nextCategory === 'cabin_desk' ? 'area' : isDeskCategory(nextCategory) ? '' : 'area';
                          setResourceForm((prev) => ({
                            ...prev,
                            resourceCategory: nextCategory,
                            type: deriveResourceTypeFromCategory(nextCategory),
                            inventoryMode: nextInventoryMode,
                            capacity: normalizeCapacityForSelection(nextCategory, nextInventoryMode, nextCategory === 'virtual_office' ? '1' : prev.capacity),
                          }));
                        }}>
                          <option value="">Select category</option>
                          {resourceCategoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>

                      {resourceForm.resourceCategory === 'open_desk' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Inventory *</label>
                          <div className="relative">
                            <select required disabled={isViewingResource} className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.inventoryMode} onChange={(e) => {
                              const nextInventoryMode = e.target.value;
                              setResourceForm((prev) => ({
                                ...prev,
                                inventoryMode: nextInventoryMode,
                                capacity: normalizeCapacityForSelection(prev.resourceCategory, nextInventoryMode, nextInventoryMode === 'single' ? '1' : prev.capacity),
                              }));
                            }}>
                              <option value="">Select inventory</option>
                              {inventoryModeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Floor *</label>
                        {floorMode === 'custom' ? (
                          <div className="space-y-2">
                            <input required disabled={isViewingResource} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.floor} onChange={(e) => setResourceForm((prev) => ({ ...prev, floor: e.target.value }))} placeholder="Enter new floor" />
                            {!isViewingResource && <button type="button" onClick={() => { setFloorMode('select'); setResourceForm((prev) => ({ ...prev, floor: '' })); }} className="text-xs font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>}
                          </div>
                        ) : (
                          <div className="relative">
                            <select required disabled={isViewingResource} className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.floor || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setFloorMode('custom'); setResourceForm((prev) => ({ ...prev, floor: '' })); return; }
                              setResourceForm((prev) => ({ ...prev, floor: nextValue }));
                            }}>
                              <option value="">Select floor</option>
                              {availableResourceFloors.map((floor) => (<option key={floor} value={floor}>{floor}</option>))}
                              {!isViewingResource && <option value={ADD_NEW_OPTION}>Add new floor</option>}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Wing</label>
                        {wingMode === 'custom' ? (
                          <div className="space-y-2">
                            <input disabled={isViewingResource} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.wing} onChange={(e) => setResourceForm((prev) => ({ ...prev, wing: e.target.value }))} placeholder="Enter new wing" />
                            {!isViewingResource && <button type="button" onClick={() => { setWingMode('select'); setResourceForm((prev) => ({ ...prev, wing: '' })); }} className="text-xs font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>}
                          </div>
                        ) : (
                          <div className="relative">
                            <select disabled={isViewingResource} className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-pmedium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.wing || ''} onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === ADD_NEW_OPTION) { setWingMode('custom'); setResourceForm((prev) => ({ ...prev, wing: '' })); return; }
                              setResourceForm((prev) => ({ ...prev, wing: nextValue }));
                            }}>
                              <option value="">Select wing</option>
                              {availableResourceWings.map((wing) => (<option key={wing} value={wing}>{wing}</option>))}
                              {!isViewingResource && <option value={ADD_NEW_OPTION}>Add new wing</option>}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                        {isDeskCategory(resourceForm.resourceCategory) ? 'Seats *' : 'Capacity *'}
                      </label>
                      {(() => {
                        const capacityOptions = getCapacityOptions(resourceForm.resourceCategory, resourceForm.inventoryMode);
                        const isSingleDeskInventory = resourceForm.resourceCategory === 'open_desk' && resourceForm.inventoryMode === 'single';
                        const selectedDeskCapacity = normalizeCapacityForSelection(resourceForm.resourceCategory, resourceForm.inventoryMode, resourceForm.capacity);
                        return isDeskCategory(resourceForm.resourceCategory) && capacityOptions.length > 0 ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <select required disabled={isViewingResource || isSingleDeskInventory} className="w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-pmedium text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" value={selectedDeskCapacity} onChange={(e) => setResourceForm((prev) => ({ ...prev, capacity: e.target.value }))}>
                                {capacityOptions.map((option) => (
                                  <option key={option} value={String(option)}>{option} {isSingleDeskInventory && option === 1 ? 'desk fixed' : option === 1 ? 'desk' : 'seats'}</option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            </div>
                            {isSingleDeskInventory ? (
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-pmedium text-emerald-800">Single desks are fixed to 1 desk.</div>
                            ) : null}
                          </div>
                        ) : (
                          <input required disabled={isViewingResource} type="number" min="1" placeholder="Enter capacity" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-pmedium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.capacity} onChange={(e) => setResourceForm((prev) => ({ ...prev, capacity: e.target.value }))} />
                        );
                      })()}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Description / Amenities</label>
                      <textarea disabled={isViewingResource} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-pmedium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.description} onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[11px] font-pmedium uppercase tracking-widest text-amber-600 mb-3">Pricing & Credits (set by Sales)</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-pmedium text-slate-800">Price Per Hour (&#8377;)</label>
                          <input type="number" min="0" disabled={isViewingResource} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.pricePerHour} onChange={(e) => setResourceForm((current) => {
                            const nextHour = e.target.value;
                            if (nextHour === '') return { ...current, pricePerHour: '', pricePerDay: '' };
                            const hourly = Number(nextHour);
                            if (!Number.isFinite(hourly) || hourly < 0) return { ...current, pricePerHour: nextHour };
                            return { ...current, pricePerHour: nextHour, pricePerDay: formatAutoPriceValue(hourly * RESOURCE_FULL_DAY_HOURS) };
                          })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-pmedium text-slate-800">Price Per Day (&#8377;)</label>
                          <input type="number" min="0" disabled={isViewingResource} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.pricePerDay} onChange={(e) => setResourceForm((current) => {
                            const nextDay = e.target.value;
                            if (nextDay === '') return { ...current, pricePerDay: '', pricePerHour: '' };
                            const daily = Number(nextDay);
                            if (!Number.isFinite(daily) || daily < 0) return { ...current, pricePerDay: nextDay };
                            return { ...current, pricePerDay: nextDay, pricePerHour: formatAutoPriceValue(daily / RESOURCE_FULL_DAY_HOURS) };
                          })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-pmedium text-slate-800">Credits</label>
                          <input type="number" min="1" step="1" disabled={isViewingResource} className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.credits} onChange={(e) => setResourceForm((prev) => ({ ...prev, credits: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Status</label>
                      <select disabled={isViewingResource} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60" value={resourceForm.status} onChange={(e) => setResourceForm((prev) => ({ ...prev, status: e.target.value }))}>
                        {resourceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-400">Preview</p>
                      <p className="mt-1 text-sm font-pmedium text-slate-800">
                        {resourceForm.pricePerHour ? `${formatCurrency(resourceForm.pricePerHour)} / hr` : 'Hourly rate not set'} &bull; {resourceForm.pricePerDay ? `${formatCurrency(resourceForm.pricePerDay)} / day` : 'Daily rate not set'}
                      </p>
                      <p className="mt-1 text-[11px] font-pmedium uppercase tracking-widest text-slate-400">
                        {getResourceCreditSummary({
                          ...selectedItem,
                          credits: Number(resourceForm.credits || selectedItem?.credits || 1),
                        })}
                      </p>
                    </div>
                  </div>
                ) : isViewingPackage ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Package Details</p>
                          <h3 className="mt-1 text-lg font-pmedium text-slate-900">{selectedPackage.name || '--'}</h3>
                          <p className="mt-0.5 text-[12px] font-pmedium text-slate-600">{viewPackageCategory} Package</p>
                          {selectedPackage.assignedTenantCompanyName ? (
                            <p className="mt-0.5 text-[11px] font-pmedium text-slate-500">Assigned to {selectedPackage.assignedTenantCompanyName}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {statusBadge(selectedPackage.status || packageForm.status)}
                          {(selectedPackage.isRecommended ?? packageForm.isRecommended) ? (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-amber-700">
                              Recommended
                            </span>
                          ) : null}
                          {hasMeaningfulValue(selectedPackage.packageCode) ? (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-700">
                              Code {selectedPackage.packageCode}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {viewPackageCategory === 'Tenant' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                          {hasMeaningfulValue(viewPackageDurationMonths) ? (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Contract Duration</p>
                              <p className="mt-1 text-base font-pmedium text-blue-900">{viewPackageDurationMonths} months</p>
                            </div>
                          ) : null}
                          {(hasMeaningfulValue(viewPackageRatePerOpenDesk) || hasMeaningfulValue(viewPackageRatePerCabinDesk)) ? (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-700">Desk Rates</p>
                              <p className="mt-1 text-[12px] font-pmedium text-amber-900">
                                {hasMeaningfulValue(viewPackageRatePerOpenDesk) ? `${formatCurrency(viewPackageRatePerOpenDesk)} open` : null}
                                {hasMeaningfulValue(viewPackageRatePerOpenDesk) && hasMeaningfulValue(viewPackageRatePerCabinDesk) ? ' / ' : null}
                                {hasMeaningfulValue(viewPackageRatePerCabinDesk) ? `${formatCurrency(viewPackageRatePerCabinDesk)} cabin` : null}
                              </p>
                            </div>
                          ) : null}
                          {hasMeaningfulValue(viewPackageMonthlyRate) ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Monthly Rent</p>
                              <p className="mt-1 text-base font-pmedium text-emerald-700">{formatCurrency(viewPackageMonthlyRate)}</p>
                              <p className="mt-0.5 text-[10px] font-pmedium text-emerald-700">{hasMeaningfulValue(viewPackageDailyRateTotal) ? `${formatCurrency(viewPackageDailyRateTotal)} / day` : ''}</p>
                            </div>
                          ) : null}
                          {hasMeaningfulValue(viewPackageTotalContractValue) ? (
                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-purple-600">Total Contract Value</p>
                              <p className="mt-1 text-base font-pmedium text-purple-700">{formatCurrency(viewPackageTotalContractValue)}</p>
                              <p className="mt-0.5 text-[10px] font-pmedium text-purple-600">Monthly rent x duration</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Scope</p>
                            <dl className="mt-3 space-y-3">
                              {hasMeaningfulValue(getTenantPackageScope(viewPackageLocationMappings)?.floor || selectedPackage.floor || packageForm.floor) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Floor</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{getTenantPackageScope(viewPackageLocationMappings)?.floor || selectedPackage.floor || packageForm.floor}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(getTenantPackageScope(viewPackageLocationMappings)?.wing || selectedPackage.wing || packageForm.wing) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Wing</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{getTenantPackageScope(viewPackageLocationMappings)?.wing || selectedPackage.wing || packageForm.wing}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(viewPackageLocationMappings.length) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Selected Blocks</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageLocationMappings.length}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(selectedPackage.locationLabel) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Location Label</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{selectedPackage.locationLabel}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Allocation</p>
                            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {hasMeaningfulValue(viewPackageOpenDesks) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Open Desks</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageOpenDesks}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(viewPackageCabinDesks) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Cabin Desks</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageCabinDesks}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(viewPackageTotalSeats) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total Seats</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageTotalSeats}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(viewPackageCreditsPerSeat) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Credits / Seat</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageCreditsPerSeat}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(viewPackageMonthlyCredits) ? (
                                <div>
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Monthly Credits</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewPackageMonthlyCredits}</dd>
                                </div>
                              ) : null}
                              {hasMeaningfulValue(selectedPackage.assignedTenantCompanyName) ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Assigned Company</dt>
                                  <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{selectedPackage.assignedTenantCompanyName}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                        </div>

                        {viewPackageLocationMappings.length > 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Included Blocks</p>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {viewPackageLocationMappings.map((mapping) => (
                                <div key={`${mapping.locationCode || mapping.label || 'block'}-${mapping.floor || ''}-${mapping.wing || ''}`} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                                  <p className="text-[12px] font-pmedium text-slate-900">{mapping.label || '--'}</p>
                                  <p className="mt-0.5 text-[10px] font-pmedium text-slate-500">
                                    {hasMeaningfulValue(mapping.floor) ? `Floor ${mapping.floor}` : null}
                                    {hasMeaningfulValue(mapping.floor) && hasMeaningfulValue(mapping.wing) ? ' / ' : ''}
                                    {hasMeaningfulValue(mapping.wing) ? `Wing ${mapping.wing}` : null}
                                  </p>
                                  <p className="mt-0.5 text-[10px] font-pmedium text-slate-500">
                                    {hasMeaningfulValue(mapping.seatType) ? `${mapping.seatType} desk` : 'Desk'}{hasMeaningfulValue(mapping.seatsAllocated) ? ` / ${mapping.seatsAllocated} seats` : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {hasMeaningfulValue(selectedPackage.description) ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Description</p>
                            <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{selectedPackage.description}</p>
                          </div>
                        ) : null}

                        {viewPackageFeatures.length > 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Feature Bullets</p>
                            <ul className="mt-2 space-y-1.5">
                              {viewPackageFeatures.map((feature) => (
                                <li key={feature} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[12px] font-pmedium text-slate-700">
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {hasMeaningfulValue(selectedPackage.creditsIncluded) ? (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-indigo-600">Credits Included</p>
                              <p className="mt-1 text-base font-pmedium text-indigo-900">{selectedPackage.creditsIncluded}</p>
                            </div>
                          ) : null}
                          {hasMeaningfulValue(viewPackagePrice) ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Price</p>
                              <p className="mt-1 text-base font-pmedium text-slate-900">{formatCurrency(viewPackagePrice)}</p>
                            </div>
                          ) : null}
                          {hasMeaningfulValue(viewPackageDurationMonths) ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Duration</p>
                              <p className="mt-1 text-base font-pmedium text-emerald-700">{viewPackageDurationMonths} months</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Summary</p>
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {hasMeaningfulValue(viewPackageTotalSeats) ? (
                              <div>
                                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Seats Included</p>
                                <p className="mt-1 text-sm font-pmedium text-slate-700">{viewPackageTotalSeats}</p>
                              </div>
                            ) : null}
                            {hasMeaningfulValue(viewPackageMonthlyCredits) ? (
                              <div>
                                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Monthly Credits</p>
                                <p className="mt-1 text-sm font-pmedium text-slate-700">{viewPackageMonthlyCredits}</p>
                              </div>
                            ) : null}
                            {(selectedPackage.isRecommended ?? packageForm.isRecommended) ? (
                              <div>
                                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Recommended</p>
                                <p className="mt-1 text-sm font-pmedium text-slate-700">Yes</p>
                              </div>
                            ) : null}
                            {hasMeaningfulValue(selectedPackage.assignedTenantCompanyName) ? (
                              <div className="sm:col-span-2">
                                <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Assigned Company</p>
                                <p className="mt-1 text-sm font-pmedium text-slate-700">{selectedPackage.assignedTenantCompanyName}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {hasMeaningfulValue(selectedPackage.description) ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Description</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedPackage.description}</p>
                          </div>
                        ) : null}

                        {viewPackageFeatures.length > 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Feature Bullets</p>
                            <ul className="mt-3 space-y-2">
                              {viewPackageFeatures.map((feature) => (
                                <li key={feature} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-pmedium text-slate-700">
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[13px] font-pmedium text-slate-400">Package Name *</label>
                      <input
                        required
                        type="text"
                        disabled={isTenantPackageRateEdit}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm((current) => ({ ...current, name: e.target.value }))}
                      />
                    </div>

                    {packageForm.category === 'Tenant' ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Building2 size={14} /></div>
                            <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-700">Location Scope</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-pmedium text-slate-400">Floor *</label>
                              <select
                                required
                                disabled={isTenantPackageRateEdit}
                                className="w-full cursor-pointer px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={packageForm.floor}
                                onChange={(e) => {
                                  const nextFloor = e.target.value;
                                  updateTenantScopeSelection(nextFloor, '');
                                }}
                              >
                                <option value="">Select floor</option>
                                {tenantFloorOptions.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-pmedium text-slate-400">Wing (Optional)</label>
                              <select
                                disabled={isTenantPackageRateEdit}
                                className="w-full cursor-pointer px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={packageForm.wing}
                                onChange={(e) => updateTenantScopeSelection(packageForm.floor, e.target.value.toUpperCase())}
                              >
                                <option value="">Select wing</option>
                                {tenantWingOptions.map((wing) => <option key={wing} value={wing}>{wing}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-pmedium text-slate-400">Block Mix</label>
                              <select
                                disabled={isTenantPackageRateEdit}
                                className="w-full cursor-pointer px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={tenantSelectionPreset}
                                onChange={(e) => handleTenantSelectionPresetChange(e.target.value)}
                              >
                                <option value="all">{getTenantSelectionPresetLabel('all')}</option>
                                <option value="open">{getTenantSelectionPresetLabel('open')}</option>
                                <option value="cabin">{getTenantSelectionPresetLabel('cabin')}</option>
                                <option value="custom">{getTenantSelectionPresetLabel('custom')}</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {tenantPackageScopeResources.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><LayoutGrid size={12} /></div>
                                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-700">Open Desk Blocks</p>
                                </div>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-emerald-700">
                                  {tenantOpenDeskResources.filter((resource) => packageForm.selectedResourceIds.includes(getTenantResourceSelectionId(resource))).length}/{tenantOpenDeskResources.length}
                                </span>
                              </div>
                              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                                {tenantOpenDeskResources.length > 0 ? tenantOpenDeskResources.map((resource) => {
                                  const selected = packageForm.selectedResourceIds.includes(getTenantResourceSelectionId(resource));
                                  return (
                                    <label key={resource.recordId} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all ${selected ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/50 hover:border-emerald-200'}`}>
                                      <input type="checkbox" disabled={isTenantPackageRateEdit} className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={selected} onChange={() => toggleTenantResourceSelection(resource.recordId)} />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[12px] font-pmedium text-slate-900">{resource.name}</p>
                                        <p className="text-[10px] font-pmedium text-slate-400">{resource.capacity} seats &bull; {formatCurrency(resource.pricePerDay)}/day &bull; {Math.max(0, Number(resource.credits || 0))} cr/seat</p>
                                        {Array.isArray(resource.seatLabels) && resource.seatLabels.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {resource.seatLabels.map((seatLabel) => (
                                              <span key={`${resource.recordId}-${seatLabel}`} className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-emerald-700">
                                                {seatLabel}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  );
                                }) : (
                                  <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-4 text-center text-xs font-pmedium text-emerald-700">No open desk blocks in this scope.</div>
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-blue-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700"><LayoutGrid size={12} /></div>
                                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-700">Cabin Desk Blocks</p>
                                </div>
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">
                                  {tenantCabinDeskResources.filter((resource) => packageForm.selectedResourceIds.includes(getTenantResourceSelectionId(resource))).length}/{tenantCabinDeskResources.length}
                                </span>
                              </div>
                              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                                {tenantCabinDeskResources.length > 0 ? tenantCabinDeskResources.map((resource) => {
                                  const selected = packageForm.selectedResourceIds.includes(getTenantResourceSelectionId(resource));
                                  return (
                                    <label key={resource.recordId} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all ${selected ? 'border-blue-300 bg-blue-50/70' : 'border-slate-100 bg-slate-50/50 hover:border-blue-200'}`}>
                                      <input type="checkbox" disabled={isTenantPackageRateEdit} className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={selected} onChange={() => toggleTenantResourceSelection(resource.recordId)} />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[12px] font-pmedium text-slate-900">{resource.name}</p>
                                        <p className="text-[10px] font-pmedium text-slate-400">{resource.capacity} seats &bull; {formatCurrency(resource.pricePerDay)}/day &bull; {Math.max(0, Number(resource.credits || 0))} cr/seat</p>
                                        {Array.isArray(resource.seatLabels) && resource.seatLabels.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {resource.seatLabels.map((seatLabel) => (
                                              <span key={`${resource.recordId}-${seatLabel}`} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">
                                                {seatLabel}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  );
                                }) : (
                                  <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-3 py-4 text-center text-xs font-pmedium text-blue-700">No cabin desk blocks in this scope.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                            <LayoutGrid size={24} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-[12px] font-pmedium text-slate-500">No area blocks found</p>
                            <p className="mt-1 text-[10px] font-pmedium text-slate-400">Add open desk and cabin desk area blocks in Resource Management first.</p>
                          </div>
                        )}

                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                              <Tag size={14} />
                            </div>
                            <p className="text-[11px] font-pmedium uppercase tracking-widest text-amber-800">Tenant Package Rates</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-pmedium text-amber-800">Open Desk Rate / Day *</label>
                              <input
                                required
                                type="number"
                                min="0"
                                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                                value={packageForm.ratePerOpenDesk}
                                onChange={(e) => setPackageForm((current) => ({ ...current, ratePerOpenDesk: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-pmedium text-amber-800">Cabin Desk Rate / Day *</label>
                              <input
                                required
                                type="number"
                                min="0"
                                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                                value={packageForm.ratePerCabinDesk}
                                onChange={(e) => setPackageForm((current) => ({ ...current, ratePerCabinDesk: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <div className="rounded-xl border border-white/70 bg-white p-2.5">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Daily Rent</p>
                              <p className="mt-1 text-sm font-pmedium text-slate-900">{formatCurrency(tenantPackageSummary.dailyRateTotal)}</p>
                            </div>
                            <div className="rounded-xl border border-white/70 bg-white p-2.5">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Monthly Rent</p>
                              <p className="mt-1 text-sm font-pmedium text-slate-900">{formatCurrency(tenantPackageSummary.monthlyRate)}</p>
                            </div>
                            <div className="rounded-xl border border-white/70 bg-white p-2.5">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Contract Value</p>
                              <p className="mt-1 text-sm font-pmedium text-slate-900">{formatCurrency(tenantPackageSummary.totalContractValue)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                          <p className="mb-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Package Summary</p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            <div className="rounded-xl border border-emerald-100 bg-white p-2.5 text-center shadow-sm">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total Seats</p>
                              <p className="mt-1 text-base font-pmedium text-slate-900">{tenantPackageSummary.totalSeats}</p>
                              <p className="text-[9px] font-pmedium text-slate-400">{tenantPackageSummary.openDesks} open / {tenantPackageSummary.cabinDesks} cabin</p>
                            </div>
                            <div className="rounded-xl border border-indigo-100 bg-white p-2.5 text-center shadow-sm">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Credits / Seat</p>
                              <p className="mt-1 text-base font-pmedium text-slate-900">{tenantPackageSummary.creditsPerSeat}</p>
                              <p className="text-[9px] font-pmedium text-slate-400">per month</p>
                            </div>
                            <div className="rounded-xl border-2 border-purple-300 bg-purple-50/70 p-2.5 text-center shadow-sm">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-purple-600">Total Monthly Credits</p>
                              <p className="mt-1 text-base font-pmedium text-purple-700">{tenantPackageSummary.monthlyCredits}</p>
                              <p className="text-[9px] font-pmedium text-purple-600">auto-renews</p>
                            </div>
                            <div className="rounded-xl border border-blue-100 bg-white p-2.5 text-center shadow-sm">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Monthly Rate</p>
                              <p className="mt-1 text-sm font-pmedium text-slate-900">{formatCurrency(tenantPackageSummary.monthlyRate)}</p>
                              <p className="text-[9px] font-pmedium text-slate-400">{formatCurrency(tenantPackageSummary.dailyRateTotal)} / day</p>
                            </div>
                            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/70 p-2.5 text-center shadow-sm">
                              <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Contract Value</p>
                              <p className="mt-1 text-sm font-pmedium text-emerald-700">{formatCurrency(tenantPackageSummary.totalContractValue)}</p>
                              <p className="text-[9px] font-pmedium text-emerald-600">{Math.max(TENANT_PACKAGE_MIN_DURATION_MONTHS, Number(packageForm.durationMonths || 0) || TENANT_PACKAGE_MIN_DURATION_MONTHS)} months</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[13px] font-pmedium text-slate-400">Credits Included *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            disabled={isTenantPackageRateEdit}
                            className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            value={packageForm.creditsIncluded}
                            onChange={(e) => setPackageForm((current) => ({ ...current, creditsIncluded: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[13px] font-pmedium text-slate-400">Price (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            disabled={isTenantPackageRateEdit}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            value={packageForm.price}
                            onChange={(e) => setPackageForm((current) => ({ ...current, price: e.target.value }))}
                          />
                        </div>

                      </div>

                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[13px] font-pmedium text-slate-400">Duration (months)</label>
                        <input
                          required
                          type="number"
                          min={packageForm.category === 'Tenant' ? TENANT_PACKAGE_MIN_DURATION_MONTHS : 1}
                          disabled={isTenantPackageRateEdit}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          value={packageForm.durationMonths}
                          onChange={(e) => setPackageForm((current) => ({ ...current, durationMonths: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-regular text-slate-400">
                          {packageForm.category === 'Tenant' ? 'Seats Included (auto-calculated)' : 'Seats Included (optional)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          readOnly={packageForm.category === 'Tenant'}
                          disabled={isTenantPackageRateEdit}
                          className={`w-full px-3 py-2.5 border rounded-xl text-[12px] font-pmedium outline-none transition-all ${packageForm.category === 'Tenant'
                            ? 'cursor-not-allowed border-dashed border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10'
                            }`}
                          value={packageForm.category === 'Tenant' ? computedTotalSeats : packageForm.seatsIncluded}
                          onChange={(e) => setPackageForm((current) => ({ ...current, seatsIncluded: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[13px] font-pmedium text-slate-400">Description</label>
                      <textarea
                        rows={3}
                        disabled={isTenantPackageRateEdit}
                        className="w-full resize-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        value={packageForm.description}
                        onChange={(e) => setPackageForm((current) => ({ ...current, description: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[13px] font-pmedium text-slate-400">Feature Bullets</label>
                      <textarea
                        rows={4}
                        placeholder="One feature per line"
                        disabled={isTenantPackageRateEdit}
                        className="w-full resize-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        value={packageForm.featuresText}
                        onChange={(e) => setPackageForm((current) => ({ ...current, featuresText: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[13px] font-pmedium text-slate-400">Status</label>
                        <select
                          disabled={isTenantPackageRateEdit}
                          className="w-full cursor-pointer px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          value={packageForm.status}
                          onChange={(e) => setPackageForm((current) => ({ ...current, status: e.target.value }))}
                        >
                          {packageStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <label className="h-10 mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <input
                          type="checkbox"
                          disabled={isTenantPackageRateEdit}
                          checked={packageForm.isRecommended}
                          onChange={(e) => setPackageForm((current) => ({ ...current, isRecommended: e.target.checked }))}
                        />
                        <span className="text-[13px] font-pmedium text-slate-600">Mark as recommended</span>
                      </label>
                    </div>

                    {packageForm.category === 'Tenant' ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-500">Tenant package note</p>
                        <p className="mt-1 text-[11px] font-pmedium leading-relaxed text-slate-600">
                          Tenant packages should reflect the number of open desks and private cabins granted to the company. Monthly credits are derived from total seats multiplied by credits per seat and automatically renew each month.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={closeModal}
                      className={`flex-1 rounded-xl border py-2.5 text-[11px] font-pmedium transition-all ${
                        isViewingPackage || isViewingResource
                          ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                      }`}
                    >
                      {isViewingPackage || isViewingResource ? 'CLOSE DETAILS' : 'CANCEL'}
                    </button>
                    {!isViewingPackage && !isViewingResource ? (
                      <button type="submit" disabled={isSaving} className="flex-1 flex items-center justify-center gap-3 rounded-xl bg-[#2563EB] py-2.5 text-[11px] font-pmedium text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isSaving ? 'SAVING...' : modalKind === 'resource' && modalMode === 'add' ? 'CREATE RESOURCE' : isTenantPackageRateEdit ? 'SAVE DESK PRICES' : 'SAVE CONFIGURATION'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </PageFrame>
    </div>
  );
}
